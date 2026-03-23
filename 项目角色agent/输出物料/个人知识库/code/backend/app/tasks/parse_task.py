"""
M2: 异步文档解析任务
上传 → 解析 → 分块 → 向量化 → 标签 → 摘要 完整流水线
"""
import asyncio
import uuid
from datetime import datetime, timezone
from loguru import logger

from app.tasks.celery_app import celery_app


def _run_async(coro):
    """在同步 Celery worker 中运行异步函数"""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, name="parse_document", max_retries=3)
def parse_document_task(self, document_id: str, user_id: str, file_key: str, file_type: str):
    """
    完整的文档解析流水线:
    1. 解析文件 → 提取文本段落
    2. 文本分块 (chunk_size=500, overlap=50)
    3. Embedding 向量化 → 写入 pgvector
    4. LLM 生成标签
    5. LLM 生成摘要
    6. 更新文档状态为 ready
    """
    logger.info(f"开始解析任务: document_id={document_id}, file_type={file_type}")

    try:
        _run_async(_async_parse_pipeline(
            document_id=uuid.UUID(document_id),
            user_id=uuid.UUID(user_id),
            file_key=file_key,
            file_type=file_type,
        ))
    except Exception as e:
        logger.error(f"解析任务失败: {e}")
        # 更新文档状态为 failed
        _run_async(_mark_document_failed(uuid.UUID(document_id), str(e)))
        raise self.retry(exc=e, countdown=60)  # 60 秒后重试


async def _async_parse_pipeline(
    document_id: uuid.UUID,
    user_id: uuid.UUID,
    file_key: str,
    file_type: str,
):
    """异步解析流水线"""
    from app.database import async_session_factory
    from app.services.file_storage import file_storage
    from app.services.document_parser import document_parser
    from app.services.web_scraper import web_scraper
    from app.services.embedding_service import embedding_service
    from app.services.vector_store import vector_store
    from app.services.tag_generator import tag_generator
    from app.utils.chunking import text_chunker
    from app.models.database import Document, DocumentTag

    async with async_session_factory() as db:
        try:
            # 1. 获取文档记录
            from sqlalchemy import select
            result = await db.execute(select(Document).where(Document.id == document_id))
            doc = result.scalar_one_or_none()
            if not doc:
                raise ValueError(f"文档不存在: {document_id}")

            # 2. 解析文件
            if file_type == "web":
                # 网页抓取
                web_data = await web_scraper.scrape(doc.original_url)
                paragraphs = web_data["paragraphs"]
                doc.title = web_data["title"]
            else:
                # 文件解析
                file_path = str(file_storage.get_file_path(file_key))
                paragraphs = await document_parser.parse(file_path, file_type)

            if not paragraphs:
                raise ValueError("文件内容为空，无法提取文本")

            # 3. 文本分块
            chunks = text_chunker.split_paragraphs(paragraphs)
            logger.info(f"分块完成: {len(chunks)} 个 chunk")

            # 4. Embedding 向量化
            texts = [c["content"] for c in chunks]
            embeddings = await embedding_service.embed_batch(texts)

            # 5. 写入 pgvector
            await vector_store.store_chunks(
                db=db,
                document_id=document_id,
                user_id=user_id,
                chunks=chunks,
                embeddings=embeddings,
            )

            # 6. 生成标签
            full_text = "\n".join(texts[:20])  # 用前 20 个 chunk 的文本
            tags = await tag_generator.generate_tags(full_text)
            for tag_label in tags:
                db.add(DocumentTag(
                    document_id=document_id,
                    label=tag_label,
                    is_ai=True,
                ))

            # 7. 生成摘要
            summary = await tag_generator.generate_summary(full_text)
            doc.summary = summary

            # 8. 更新状态
            doc.status = "ready"
            doc.parsed_at = datetime.now(timezone.utc)
            if file_type == "pdf":
                doc.page_count = len(set(c.get("page_num") for c in chunks if c.get("page_num")))

            await db.commit()
            logger.info(f"解析流水线完成: document_id={document_id}")

        except Exception as e:
            await db.rollback()
            raise


async def _mark_document_failed(document_id: uuid.UUID, error_message: str):
    """标记文档解析失败"""
    from app.database import async_session_factory
    from app.models.database import Document
    from sqlalchemy import select

    async with async_session_factory() as db:
        result = await db.execute(select(Document).where(Document.id == document_id))
        doc = result.scalar_one_or_none()
        if doc:
            doc.status = "failed"
            doc.error_message = error_message
            await db.commit()
