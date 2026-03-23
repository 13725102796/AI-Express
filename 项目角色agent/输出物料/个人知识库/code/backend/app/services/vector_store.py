"""
M2: 向量存储服务 — pgvector 操作抽象层
支持向量写入、相似度搜索、删除
"""
import uuid
from sqlalchemy import select, delete, text, func
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.database import DocChunk, Document


class VectorStoreService:
    """pgvector 向量操作抽象层"""

    async def store_chunks(
        self,
        db: AsyncSession,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
        chunks: list[dict],
        embeddings: list[list[float]],
    ) -> int:
        """
        将文本块及其向量写入数据库。
        chunks: [{"heading", "content", "page_num", "chunk_index"}]
        embeddings: 对应的向量列表
        返回写入的 chunk 数量。
        """
        if len(chunks) != len(embeddings):
            raise ValueError("chunks 和 embeddings 数量不匹配")

        db_chunks = []
        for chunk, embedding in zip(chunks, embeddings):
            db_chunk = DocChunk(
                document_id=document_id,
                user_id=user_id,
                chunk_index=chunk["chunk_index"],
                heading=chunk.get("heading"),
                content=chunk["content"],
                page_num=chunk.get("page_num"),
                embedding=embedding,
            )
            db_chunks.append(db_chunk)

        db.add_all(db_chunks)
        await db.flush()
        logger.info(f"向量写入完成: document_id={document_id}, {len(db_chunks)} 个 chunk")
        return len(db_chunks)

    async def similarity_search(
        self,
        db: AsyncSession,
        query_embedding: list[float],
        user_id: uuid.UUID,
        space_id: uuid.UUID | None = None,
        top_k: int = 10,
        score_threshold: float = 0.3,
    ) -> list[dict]:
        """
        向量相似度搜索（余弦相似度）。
        返回最相关的 top_k 个文本块。
        """
        # 构建查询：余弦相似度 = 1 - cosine_distance
        query = (
            select(
                DocChunk,
                Document.title.label("doc_title"),
                Document.file_type.label("doc_file_type"),
                (1 - DocChunk.embedding.cosine_distance(query_embedding)).label("similarity"),
            )
            .join(Document, DocChunk.document_id == Document.id)
            .where(DocChunk.user_id == user_id)
            .where(Document.status == "ready")
        )

        if space_id:
            query = query.where(Document.space_id == space_id)

        query = (
            query
            .order_by(text("similarity DESC"))
            .limit(top_k)
        )

        result = await db.execute(query)
        rows = result.all()

        search_results = []
        for chunk, doc_title, doc_file_type, similarity in rows:
            if similarity < score_threshold:
                continue
            search_results.append({
                "chunk_id": chunk.id,
                "document_id": chunk.document_id,
                "document_title": doc_title,
                "document_type": doc_file_type,
                "heading": chunk.heading,
                "content": chunk.content,
                "page_num": chunk.page_num,
                "similarity": float(similarity),
                "chunk_index": chunk.chunk_index,
            })

        logger.info(f"相似度搜索完成: {len(search_results)} 个结果 (阈值: {score_threshold})")
        return search_results

    async def delete_document_chunks(self, db: AsyncSession, document_id: uuid.UUID) -> int:
        """删除文档的所有向量索引"""
        result = await db.execute(
            delete(DocChunk).where(DocChunk.document_id == document_id)
        )
        count = result.rowcount
        logger.info(f"删除向量索引: document_id={document_id}, 删除 {count} 个 chunk")
        return count

    async def get_document_chunks(
        self,
        db: AsyncSession,
        document_id: uuid.UUID,
    ) -> list[DocChunk]:
        """获取文档的所有文本块"""
        result = await db.execute(
            select(DocChunk)
            .where(DocChunk.document_id == document_id)
            .order_by(DocChunk.chunk_index)
        )
        return list(result.scalars().all())


# 单例
vector_store = VectorStoreService()
