"""
已有文档重新向量化脚本
对所有没有 embedding 的 doc_chunks 重新生成 BGE-M3 embedding 向量。

用法:
    cd backend
    python -m scripts.reindex_embeddings
"""
import asyncio
import sys
import os

# 确保可以导入 app 模块
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.database import DocChunk
from app.services.embedding_service import embedding_service


BATCH_SIZE = 32  # 每批处理的 chunk 数量


async def reindex_all():
    """遍历所有没有 embedding 的 chunks，批量生成 embedding 并写回数据库"""

    async with async_session_factory() as db:
        # 统计总数
        total_result = await db.execute(
            select(func.count()).where(DocChunk.embedding == None)  # noqa: E711
        )
        total = total_result.scalar() or 0
        logger.info(f"需要重新向量化的 chunk 数量: {total}")

        if total == 0:
            logger.info("所有 chunk 已有 embedding，无需处理")
            return

        processed = 0
        offset = 0

        while offset < total:
            # 查询一批没有 embedding 的 chunks
            result = await db.execute(
                select(DocChunk)
                .where(DocChunk.embedding == None)  # noqa: E711
                .order_by(DocChunk.id)
                .offset(0)  # 始终取第一批，因为处理后它们就有 embedding 了
                .limit(BATCH_SIZE)
            )
            chunks = list(result.scalars().all())

            if not chunks:
                break

            # 提取文本
            texts = [c.content for c in chunks]

            # 生成 embedding
            try:
                embeddings = await embedding_service.embed_batch(texts)

                # 写回数据库
                for chunk, embedding in zip(chunks, embeddings):
                    chunk.embedding = embedding

                await db.commit()
                processed += len(chunks)
                logger.info(f"进度: {processed}/{total} ({processed/total*100:.1f}%)")

            except Exception as e:
                logger.error(f"批次处理失败: {e}")
                await db.rollback()
                offset += BATCH_SIZE  # 跳过失败批次继续
                continue

        logger.info(f"重新向量化完成: 共处理 {processed} 个 chunk")


if __name__ == "__main__":
    logger.info("开始重新向量化...")
    asyncio.run(reindex_all())
