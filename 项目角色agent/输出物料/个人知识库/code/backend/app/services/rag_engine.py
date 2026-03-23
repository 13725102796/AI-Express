"""
RAG 检索增强生成引擎 - v2
三级检索架构：Dense + Sparse 双路召回 → RRF 融合 → Reranker 精排
"""
import asyncio
import json
import uuid
from typing import AsyncGenerator
from loguru import logger

from app.services.embedding_service import embedding_service
from app.services.vector_store import vector_store
from app.services.llm_service import llm_service
from app.utils.prompts import build_rag_prompt
from app.config import get_settings

settings = get_settings()


class RAGEngine:
    """RAG 检索增强生成引擎 — 三级检索架构"""

    # ─── 第一级：双路召回 ───────────────────────────

    async def _dense_retrieve(
        self,
        db,
        query_embedding: list[float],
        user_id: uuid.UUID,
        space_id: uuid.UUID | None,
        top_k: int,
    ) -> list[dict]:
        """Dense 向量检索（pgvector cosine similarity）"""
        return await vector_store.similarity_search(
            db=db,
            query_embedding=query_embedding,
            user_id=user_id,
            space_id=space_id,
            top_k=top_k,
            score_threshold=0.0,  # 一级召回不过滤，交给后续排序
        )

    async def _sparse_retrieve(
        self,
        db,
        query_sparse: dict,
        user_id: uuid.UUID,
        space_id: uuid.UUID | None,
        top_k: int,
    ) -> list[dict]:
        """Sparse 检索（基于 BGE-M3 lexical weights + PostgreSQL ILIKE）"""
        return await vector_store.sparse_search(
            db=db,
            query_sparse=query_sparse,
            user_id=user_id,
            space_id=space_id,
            top_k=top_k,
        )

    # ─── 第二级：RRF 融合 ─────────────────────────

    def _rrf_fusion(
        self,
        dense_results: list[dict],
        sparse_results: list[dict],
        k: int = 60,
    ) -> list[dict]:
        """
        Reciprocal Rank Fusion (RRF) 融合排序。
        RRF_score(d) = Sigma 1/(k + rank_i(d))
        """
        scores: dict[str, float] = {}
        doc_map: dict[str, dict] = {}

        # Dense 排名分
        for rank, doc in enumerate(dense_results):
            doc_id = str(doc["chunk_id"])
            scores[doc_id] = scores.get(doc_id, 0) + 1.0 / (k + rank + 1)
            doc_map[doc_id] = doc

        # Sparse 排名分
        for rank, doc in enumerate(sparse_results):
            doc_id = str(doc["chunk_id"])
            scores[doc_id] = scores.get(doc_id, 0) + 1.0 / (k + rank + 1)
            if doc_id not in doc_map:
                doc_map[doc_id] = doc

        # 按 RRF 分数降序
        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

        fused = []
        for doc_id in sorted_ids:
            doc = doc_map[doc_id].copy()
            doc["rrf_score"] = scores[doc_id]
            fused.append(doc)

        return fused

    # ─── 第三级：Reranker 精排 ────────────────────

    async def _rerank(
        self,
        query: str,
        candidates: list[dict],
        top_k: int,
    ) -> list[dict]:
        """使用 Cross-Encoder Reranker 对 RRF 候选精排"""
        if not candidates:
            return []

        passages = [c["content"] for c in candidates]
        reranked = await embedding_service.rerank(
            query=query,
            passages=passages,
            top_k=top_k,
        )

        results = []
        for item in reranked:
            idx = item["index"]
            doc = candidates[idx].copy()
            doc["rerank_score"] = item["score"]
            doc["similarity"] = item["score"]  # 最终相似度用 reranker 分数
            results.append(doc)

        return results

    # ─── 完整检索流程 ─────────────────────────────

    async def retrieve(
        self,
        db,
        query: str,
        user_id: uuid.UUID,
        space_id: uuid.UUID | None = None,
        top_k: int = 10,
    ) -> list[dict]:
        """
        三级检索流程：
        1. Dense + Sparse 双路召回（各 top_k=50）
        2. RRF 融合排序
        3. Reranker 精排 -> 返回 top_k
        """
        recall_k = settings.RETRIEVAL_TOP_K  # 50

        try:
            # Step 1: 生成 query 的 dense + sparse 向量
            query_vectors = await embedding_service.embed_text_with_sparse(query)
            query_dense = query_vectors["dense"]
            query_sparse = query_vectors["sparse"]

            # Step 2: 双路召回（并行）
            dense_task = self._dense_retrieve(
                db, query_dense, user_id, space_id, recall_k
            )
            sparse_task = self._sparse_retrieve(
                db, query_sparse, user_id, space_id, recall_k
            )
            dense_results, sparse_results = await asyncio.gather(
                dense_task, sparse_task
            )

            logger.info(
                f"双路召回: dense={len(dense_results)}, "
                f"sparse={len(sparse_results)}"
            )

            # Step 3: RRF 融合
            fused = self._rrf_fusion(
                dense_results, sparse_results, k=settings.RRF_K
            )
            logger.info(f"RRF 融合后: {len(fused)} 个候选")

            # Step 4: Reranker 精排（取 RRF top 30 送入 reranker）
            rerank_candidates = fused[:30]
            final_results = await self._rerank(
                query, rerank_candidates, top_k
            )

            # 过滤低分结果
            final_results = [
                r for r in final_results
                if r.get("rerank_score", 0) >= settings.RETRIEVAL_SCORE_THRESHOLD
            ]

            if final_results:
                logger.info(
                    f"Reranker 精排完成: {len(final_results)} 个结果 "
                    f"(top1 score={final_results[0]['rerank_score']:.4f})"
                )
            else:
                logger.info("Reranker 精排完成: 0 个结果")

            return final_results

        except Exception as e:
            logger.error(f"三级检索失败，降级到纯 dense 检索: {e}")
            # 降级方案：仅用 dense 检索
            try:
                query_dense = await embedding_service.embed_text(query)
                return await self._dense_retrieve(
                    db, query_dense, user_id, space_id, top_k
                )
            except Exception as e2:
                logger.error(f"Dense 检索也失败，降级到关键词检索: {e2}")
                return await self._keyword_fallback(db, query, user_id, space_id, top_k)

    async def _keyword_fallback(
        self,
        db,
        query: str,
        user_id: uuid.UUID,
        space_id: uuid.UUID | None,
        top_k: int,
    ) -> list[dict]:
        """最终降级方案：关键词检索"""
        import re
        from sqlalchemy import select, or_
        from app.models.database import DocChunk, Document

        stop_words_cn = {"的", "是", "什么", "了", "吗", "呢", "在", "和", "与", "有", "这", "那", "一个", "帮我", "总结", "一下", "请问", "怎么", "如何", "哪些", "能不能", "可以", "告诉", "关于"}
        stop_words_en = {"the", "is", "are", "was", "were", "be", "been", "being", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "what", "how", "which", "who", "where", "when", "do", "does", "did", "my", "your", "our", "their", "this", "that", "it"}

        segments = [s.strip() for s in re.split(r'[\s,，。？！、；：\u201c\u201d\u2018\u2019（）()]+', query) if s.strip()]
        words = set()
        for seg in segments:
            is_english = bool(re.match(r'^[a-zA-Z0-9._\-]+$', seg))
            if is_english:
                if len(seg) >= 2 and seg.lower() not in stop_words_en:
                    words.add(seg)
            else:
                clean_seg = seg
                for sw in stop_words_cn:
                    clean_seg = clean_seg.replace(sw, "")
                if len(clean_seg) >= 2:
                    words.add(clean_seg)
                for i in range(len(clean_seg) - 1):
                    w = clean_seg[i:i+2]
                    if w not in stop_words_cn and len(w) >= 2:
                        words.add(w)

        words = list(words) if words else [query]
        logger.info(f"关键词 fallback 检索: {words}")

        keyword_conditions = [DocChunk.content.ilike(f"%{w}%") for w in words]
        stmt = (
            select(
                DocChunk.id, DocChunk.document_id, DocChunk.content,
                DocChunk.chunk_index, DocChunk.page_num, DocChunk.heading,
                Document.title.label("document_title"),
                Document.file_type.label("document_type"),
            )
            .join(Document, DocChunk.document_id == Document.id)
            .where(DocChunk.user_id == user_id, or_(*keyword_conditions))
        )
        if space_id:
            stmt = stmt.where(Document.space_id == space_id)
        stmt = stmt.limit(top_k)

        result = await db.execute(stmt)
        rows = result.all()

        return [
            {
                "chunk_id": str(row.id),
                "document_id": str(row.document_id),
                "document_title": row.document_title,
                "document_type": row.document_type,
                "heading": row.heading,
                "content": row.content,
                "similarity": 0.8,
                "page_num": row.page_num,
            }
            for row in rows
        ]

    async def generate_stream(
        self,
        query: str,
        context_chunks: list[dict],
        conversation_history: list[dict] | None = None,
        conversation_id: str | None = None,
        message_id: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        步骤 2: 流式生成回答
        1. 构建 Prompt（系统指令 + 相关段落 + 对话历史 + 用户问题）
        2. 调用 LLM 流式生成
        3. 返回 SSE 事件流
        """
        # 发送开始事件
        yield f"event: message_start\ndata: {json.dumps({'conversationId': conversation_id, 'messageId': message_id}, ensure_ascii=False)}\n\n"

        # 无相关内容
        if not context_chunks:
            no_content_msg = "知识库中未找到与该问题相关的资料。建议上传相关文档后再提问。"
            yield f"event: text_delta\ndata: {json.dumps({'delta': no_content_msg}, ensure_ascii=False)}\n\n"
            yield f"event: message_end\ndata: {json.dumps({'content': no_content_msg, 'citations': []}, ensure_ascii=False)}\n\n"
            return

        # 构建 Prompt
        messages = build_rag_prompt(query, context_chunks, conversation_history)

        # 发送引用信息
        citations = []
        for i, chunk in enumerate(context_chunks[:10]):  # 最多 10 个引用
            citation = {
                "index": i + 1,
                "sourceId": str(chunk["document_id"]),
                "sourceTitle": chunk["document_title"],
                "sourceType": chunk["document_type"],
                "excerpt": chunk["content"][:200],
                "confidence": chunk["similarity"],
                "pageNum": chunk.get("page_num"),
            }
            citations.append(citation)
            yield f"event: citation\ndata: {json.dumps(citation, ensure_ascii=False)}\n\n"

        # 流式生成回答
        full_content = ""
        async for event in llm_service.chat_completion_stream(messages):
            # 转发 LLM 的 SSE 事件
            yield event
            # 追踪完整内容
            if "text_delta" in event:
                try:
                    data_line = event.split("data: ", 1)[1].strip()
                    data = json.loads(data_line)
                    full_content += data.get("delta", "")
                except (IndexError, json.JSONDecodeError):
                    pass

    async def query(
        self,
        db,
        query: str,
        user_id: uuid.UUID,
        space_id: uuid.UUID | None = None,
        conversation_history: list[dict] | None = None,
        conversation_id: str | None = None,
        message_id: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        完整 RAG 流程: 三级检索 + 流式生成
        返回 SSE 事件流
        """
        # 检索
        context_chunks = await self.retrieve(db, query, user_id, space_id)
        logger.info(f"RAG 检索完成: {len(context_chunks)} 个相关段落")

        # 流式生成
        async for event in self.generate_stream(
            query=query,
            context_chunks=context_chunks,
            conversation_history=conversation_history,
            conversation_id=conversation_id,
            message_id=message_id,
        ):
            yield event


# 单例
rag_engine = RAGEngine()
