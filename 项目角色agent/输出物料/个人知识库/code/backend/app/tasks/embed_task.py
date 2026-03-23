"""
M2: 独立的向量化任务（可用于重建索引等场景）
"""
import asyncio
import uuid
from loguru import logger

from app.tasks.celery_app import celery_app


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, name="reindex_document", max_retries=2)
def reindex_document_task(self, document_id: str, user_id: str):
    """
    重新对文档进行向量化索引。
    用于 embedding 模型更新后的重建场景。
    """
    logger.info(f"开始重索引: document_id={document_id}")
    try:
        _run_async(_async_reindex(uuid.UUID(document_id), uuid.UUID(user_id)))
    except Exception as e:
        logger.error(f"重索引失败: {e}")
        raise self.retry(exc=e, countdown=120)


async def _async_reindex(document_id: uuid.UUID, user_id: uuid.UUID):
    """异步重索引"""
    from app.database import async_session_factory
    from app.services.embedding_service import embedding_service
    from app.services.vector_store import vector_store
    from app.models.database import DocChunk
    from sqlalchemy import select

    async with async_session_factory() as db:
        # 获取现有 chunks
        result = await db.execute(
            select(DocChunk)
            .where(DocChunk.document_id == document_id)
            .order_by(DocChunk.chunk_index)
        )
        chunks = result.scalars().all()

        if not chunks:
            logger.warning(f"文档无 chunks: {document_id}")
            return

        # 重新生成 embedding
        texts = [c.content for c in chunks]
        embeddings = await embedding_service.embed_batch(texts)

        # 更新向量
        for chunk, embedding in zip(chunks, embeddings):
            chunk.embedding = embedding

        await db.commit()
        logger.info(f"重索引完成: document_id={document_id}, {len(chunks)} 个 chunk")
