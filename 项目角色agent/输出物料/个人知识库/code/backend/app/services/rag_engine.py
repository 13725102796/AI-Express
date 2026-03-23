"""
M3: RAG 检索 + 生成引擎
查询向量化 → pgvector 相似度搜索 → Prompt 构造 → LLM 流式生成
"""
import json
import uuid
from typing import AsyncGenerator
from loguru import logger

from app.services.embedding_service import embedding_service
from app.services.vector_store import vector_store
from app.services.llm_service import llm_service
from app.utils.prompts import build_rag_prompt


class RAGEngine:
    """RAG 检索增强生成引擎"""

    async def retrieve(
        self,
        db,
        query: str,
        user_id: uuid.UUID,
        space_id: uuid.UUID | None = None,
        top_k: int = 10,
    ) -> list[dict]:
        """
        步骤 1: 检索相关段落
        优先语义检索（embedding），fallback 到关键词检索
        """
        try:
            # 向量化查询
            query_embedding = await embedding_service.embed_text(query)

            # 相似度搜索
            results = await vector_store.similarity_search(
                db=db,
                query_embedding=query_embedding,
                user_id=user_id,
                space_id=space_id,
                top_k=top_k,
                score_threshold=0.3,
            )
            return results

        except Exception as e:
            logger.warning(f"Embedding 不可用，降级到关键词检索: {e}")

            # Keyword fallback: 在 doc_chunks 中搜索
            # 把问句拆成关键词，去掉停用词，用 OR 匹配
            from sqlalchemy import select, func, or_
            from app.models.database import DocChunk, Document

            # 智能拆词：英文按空格分词，中文用 n-gram
            import re
            stop_words_cn = {"的", "是", "什么", "了", "吗", "呢", "在", "和", "与", "有", "这", "那", "一个", "帮我", "总结", "一下", "请问", "怎么", "如何", "哪些", "能不能", "可以", "告诉", "关于"}
            stop_words_en = {"the", "is", "are", "was", "were", "be", "been", "being", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "what", "how", "which", "who", "where", "when", "do", "does", "did", "my", "your", "our", "their", "this", "that", "it"}

            # 按空格和标点拆分
            segments = [s.strip() for s in re.split(r'[\s,，。？！、；：""''（）\(\)]+', query) if s.strip()]

            words = set()
            for seg in segments:
                # 判断是英文还是中文
                is_english = bool(re.match(r'^[a-zA-Z0-9._\-]+$', seg))

                if is_english:
                    # 英文：保留完整单词（>=2字母且不是停用词）
                    if len(seg) >= 2 and seg.lower() not in stop_words_en:
                        words.add(seg)
                else:
                    # 中文：去停用词 + n-gram
                    clean_seg = seg
                    for sw in stop_words_cn:
                        clean_seg = clean_seg.replace(sw, "")
                    if len(clean_seg) >= 2:
                        words.add(clean_seg)
                    # 2-3 gram for Chinese
                    for i in range(len(clean_seg) - 1):
                        w = clean_seg[i:i+2]
                        if w not in stop_words_cn and len(w) >= 2:
                            words.add(w)
                    for i in range(len(clean_seg) - 2):
                        w = clean_seg[i:i+3]
                        if w not in stop_words_cn:
                            words.add(w)

            words = list(words) if words else [query]

            logger.info(f"关键词检索: {words}")

            # 构建 OR 条件
            keyword_conditions = [DocChunk.content.ilike(f"%{w}%") for w in words]

            stmt = (
                select(
                    DocChunk.id,
                    DocChunk.document_id,
                    DocChunk.content,
                    DocChunk.chunk_index,
                    DocChunk.page_num,
                    Document.title.label("document_title"),
                    Document.file_type.label("document_type"),
                )
                .join(Document, DocChunk.document_id == Document.id)
                .where(
                    DocChunk.user_id == user_id,
                    or_(*keyword_conditions),
                )
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
                    "content": row.content,
                    "similarity": 0.8,  # keyword match 默认置信度
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
        完整 RAG 流程: 检索 + 生成
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
