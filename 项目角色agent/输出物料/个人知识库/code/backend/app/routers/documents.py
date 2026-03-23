"""
M2 + M4: 文档管理路由
- POST   /api/documents/upload         文件上传
- POST   /api/documents/url            URL 保存
- GET    /api/documents                列表（分页+筛选+排序）
- GET    /api/documents/:id            详情
- GET    /api/documents/:id/chunks     分块列表
- DELETE /api/documents/:id            删除
- PATCH  /api/documents/:id/tags       更新标签
- DELETE /api/documents/batch          批量删除
- PATCH  /api/documents/batch/move     批量移动
- PATCH  /api/documents/:id/space      移动知识空间
- GET    /api/documents/:id/related    相关推荐
"""
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from loguru import logger

from app.database import get_db
from app.dependencies import get_current_user
from app.models.database import User, Document, DocumentTag, Space, DocChunk
from app.models.schemas import (
    DocumentUploadResponse, DocumentURLRequest, DocumentURLResponse,
    DocumentListItem, DocumentListResponse, DocumentDetailResponse,
    TagItem, ChunkContent, UpdateTagsRequest, BatchDeleteRequest,
    MoveDocumentRequest, RelatedDocumentItem, SuccessResponse,
    DocChunkItem, DocChunkListResponse, BatchMoveRequest,
)
from app.services.file_storage import file_storage
from app.services.document_parser import DocumentParser, document_parser
from app.services.web_scraper import web_scraper
from app.utils.chunking import text_chunker
from app.config import get_settings

settings = get_settings()
router = APIRouter()

# 允许的文件格式
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".md", ".txt", ".csv", ".xlsx", ".png", ".jpg", ".jpeg", ".webp"}
MAX_FILE_SIZE = settings.max_file_size_bytes


# ============================================================
# POST /upload — 文件上传
# ============================================================

@router.post("/upload", response_model=DocumentUploadResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    space_id: Optional[str] = Form(default=None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    上传文件到知识库。支持 PDF、Word、Markdown、TXT。
    文件大小限制 50MB。上传后自动触发异步解析流程。
    """
    # 1. 文件格式校验
    if not file.filename:
        raise HTTPException(status_code=400, detail={"error": "NO_FILENAME", "message": "文件名不能为空"})

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "UNSUPPORTED_FORMAT",
                "message": f"暂不支持该格式，当前支持：PDF、Word、Markdown、纯文本",
            },
        )

    # 2. 文件大小校验
    content = await file.read()
    await file.seek(0)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail={"error": "FILE_TOO_LARGE", "message": f"文件过大(超过{settings.MAX_FILE_SIZE_MB}MB)，请拆分后上传"},
        )

    # 3. 确定目标知识空间
    target_space_id = None
    if space_id:
        target_space_id = uuid.UUID(space_id)
        # 验证空间属于当前用户
        space_result = await db.execute(
            select(Space).where(Space.id == target_space_id, Space.user_id == user.id)
        )
        if not space_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail={"error": "SPACE_NOT_FOUND", "message": "知识空间不存在"})
    else:
        # 使用默认空间
        space_result = await db.execute(
            select(Space).where(Space.user_id == user.id, Space.name == "通用")
        )
        default_space = space_result.scalar_one_or_none()
        if not default_space:
            # 自动创建默认空间
            default_space = Space(user_id=user.id, name="通用", description="默认知识空间")
            db.add(default_space)
            await db.flush()
        target_space_id = default_space.id

    # 4. 创建文档记录
    file_type = DocumentParser.get_file_type(file.filename) or "txt"
    doc = Document(
        user_id=user.id,
        space_id=target_space_id,
        title=Path(file.filename).stem,
        file_name=file.filename,
        file_type=file_type,
        file_size=len(content),
        status="processing",
    )
    db.add(doc)
    await db.flush()

    # 5. 保存文件
    file_key = await file_storage.save_upload(file, user.id, doc.id)
    doc.file_key = file_key

    # 6. 触发解析
    logger.info(f"文件上传成功: {file.filename} -> document_id={doc.id}")

    if settings.APP_ENV == "development":
        # 开发环境：同步执行解析管道（不依赖 Celery）
        try:
            file_path = str(file_storage.get_file_path(file_key))
            paragraphs = await document_parser.parse(file_path, file_type)
            if not paragraphs:
                raise ValueError("文件内容为空，无法提取文本")

            chunks = text_chunker.split_paragraphs(paragraphs)
            for chunk in chunks:
                db.add(DocChunk(
                    document_id=doc.id,
                    user_id=user.id,
                    chunk_index=chunk["chunk_index"],
                    heading=chunk.get("heading"),
                    content=chunk["content"],
                    page_num=chunk.get("page_num"),
                ))

            doc.status = "ready"
            doc.parsed_at = datetime.utcnow()
            if file_type == "pdf":
                doc.page_count = len(set(c.get("page_num") for c in chunks if c.get("page_num")))
            logger.info(f"开发模式同步解析完成: document_id={doc.id}, {len(chunks)} chunks")
        except Exception as e:
            logger.error(f"开发模式同步解析失败: {e}")
            doc.status = "failed"
            doc.error_message = str(e)
    # 生产环境：保持现有 Celery 异步方式（在 tasks/ 中处理）

    return DocumentUploadResponse(
        id=doc.id,
        file_name=doc.file_name,
        file_type=doc.file_type,
        file_size=doc.file_size,
        status=doc.status,
        space_id=target_space_id,
        created_at=doc.created_at,
    )


# ============================================================
# POST /url — URL 保存
# ============================================================

@router.post("/url", response_model=DocumentURLResponse, status_code=201)
async def save_url(
    body: DocumentURLRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """保存网页 URL 到知识库，自动抓取正文内容"""
    url_str = str(body.url)

    # 确定目标知识空间
    if body.space_id:
        space_result = await db.execute(
            select(Space).where(Space.id == body.space_id, Space.user_id == user.id)
        )
        if not space_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail={"error": "SPACE_NOT_FOUND", "message": "知识空间不存在"})
        target_space_id = body.space_id
    else:
        space_result = await db.execute(
            select(Space).where(Space.user_id == user.id, Space.name == "通用")
        )
        default_space = space_result.scalar_one_or_none()
        if not default_space:
            default_space = Space(user_id=user.id, name="通用", description="默认知识空间")
            db.add(default_space)
            await db.flush()
        target_space_id = default_space.id

    # 创建文档记录
    doc = Document(
        user_id=user.id,
        space_id=target_space_id,
        title=url_str,  # 后续抓取后更新
        file_type="web",
        original_url=url_str,
        status="processing",
    )
    db.add(doc)
    await db.flush()

    logger.info(f"URL 保存成功: {url_str} -> document_id={doc.id}")

    if settings.APP_ENV == "development":
        # 开发环境：同步执行网页抓取 + 解析管道
        try:
            web_data = await web_scraper.scrape(url_str)
            paragraphs = web_data["paragraphs"]
            doc.title = web_data["title"]

            if not paragraphs:
                raise ValueError("网页内容为空，无法提取文本")

            chunks = text_chunker.split_paragraphs(paragraphs)
            for chunk in chunks:
                db.add(DocChunk(
                    document_id=doc.id,
                    user_id=user.id,
                    chunk_index=chunk["chunk_index"],
                    heading=chunk.get("heading"),
                    content=chunk["content"],
                    page_num=chunk.get("page_num"),
                ))

            doc.status = "ready"
            doc.parsed_at = datetime.utcnow()
            logger.info(f"开发模式同步解析完成 (URL): document_id={doc.id}, {len(chunks)} chunks")
        except Exception as e:
            logger.error(f"开发模式同步解析失败 (URL): {e}")
            doc.status = "failed"
            doc.error_message = str(e)
    # 生产环境：保持现有 Celery 异步方式

    return DocumentURLResponse(
        id=doc.id,
        title=doc.title,
        file_type=doc.file_type,
        original_url=doc.original_url,
        status=doc.status,
        space_id=target_space_id,
        created_at=doc.created_at,
    )


# ============================================================
# GET / — 文档列表
# ============================================================

@router.get("", response_model=DocumentListResponse)
async def list_documents(
    space_id: Optional[uuid.UUID] = Query(default=None),
    file_type: Optional[str] = Query(default=None),
    tag: Optional[str] = Query(default=None),
    sort: str = Query(default="created_at"),
    order: str = Query(default="desc"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取知识条目列表，支持分页、筛选和排序"""
    query = (
        select(Document)
        .options(selectinload(Document.tags), selectinload(Document.space))
        .where(Document.user_id == user.id)
    )

    # 筛选
    if space_id:
        query = query.where(Document.space_id == space_id)
    if file_type:
        query = query.where(Document.file_type == file_type)
    if tag:
        query = query.join(DocumentTag).where(DocumentTag.label == tag)

    # 统计总数
    count_query = select(func.count()).select_from(
        query.with_only_columns(Document.id).subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 排序
    sort_column = getattr(Document, sort, Document.created_at)
    if order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # 分页
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    docs = result.scalars().unique().all()

    items = []
    for doc in docs:
        items.append(DocumentListItem(
            id=doc.id,
            title=doc.title,
            file_type=doc.file_type,
            file_size=doc.file_size,
            summary=doc.summary,
            tags=[TagItem(id=t.id, label=t.label, is_ai=t.is_ai) for t in doc.tags],
            space_name=doc.space.name if doc.space else None,
            status=doc.status,
            created_at=doc.created_at,
        ))

    return DocumentListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        has_more=(page * limit) < total,
    )


# ============================================================
# GET /:id — 文档详情
# ============================================================

@router.get("/{doc_id}", response_model=DocumentDetailResponse)
async def get_document(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取知识条目详情，包含提取内容和元信息"""
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags), selectinload(Document.space), selectinload(Document.chunks))
        .where(Document.id == doc_id, Document.user_id == user.id)
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "文档不存在"})

    # 构建提取内容
    extracted_content = []
    for chunk in sorted(doc.chunks, key=lambda c: c.chunk_index):
        extracted_content.append(ChunkContent(
            paragraph_id=f"p{chunk.chunk_index}",
            heading=chunk.heading,
            content=chunk.content,
        ))

    return DocumentDetailResponse(
        id=doc.id,
        title=doc.title,
        file_name=doc.file_name,
        file_type=doc.file_type,
        file_size=doc.file_size,
        page_count=doc.page_count,
        original_url=doc.original_url,
        space_id=doc.space_id,
        space_name=doc.space.name if doc.space else None,
        tags=[TagItem(id=t.id, label=t.label, is_ai=t.is_ai) for t in doc.tags],
        extracted_content=extracted_content,
        summary=doc.summary,
        status=doc.status,
        error_message=doc.error_message,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


# ============================================================
# GET /:id/chunks — 分块列表
# ============================================================

@router.get("/{doc_id}/chunks", response_model=DocChunkListResponse)
async def get_document_chunks(
    doc_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取文档的分块列表"""
    # 验证文档属于当前用户
    doc_result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == user.id)
    )
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "文档不存在"})

    # 统计总数
    count_result = await db.execute(
        select(func.count()).where(DocChunk.document_id == doc_id)
    )
    total = count_result.scalar() or 0

    # 分页查询
    offset = (page - 1) * limit
    chunk_result = await db.execute(
        select(DocChunk)
        .where(DocChunk.document_id == doc_id)
        .order_by(DocChunk.chunk_index)
        .offset(offset)
        .limit(limit)
    )
    chunks = chunk_result.scalars().all()

    items = []
    for chunk in chunks:
        items.append(DocChunkItem(
            id=chunk.id,
            chunk_index=chunk.chunk_index,
            heading=chunk.heading,
            content=chunk.content,
            token_count=None,  # DocChunk 模型暂无此字段
            has_embedding=chunk.embedding is not None,
        ))

    return DocChunkListResponse(items=items, total=total)


# ============================================================
# DELETE /:id — 删除文档
# ============================================================

@router.delete("/{doc_id}")
async def delete_document(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """删除知识条目及其关联的向量索引和文件"""
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == user.id)
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "文档不存在"})

    # 删除存储文件
    if doc.file_key:
        await file_storage.delete_file(doc.file_key)

    # 删除数据库记录（级联删除 chunks、tags 等）
    await db.delete(doc)
    await db.flush()

    logger.info(f"文档已删除: document_id={doc_id}")
    return {"success": True}


# ============================================================
# DELETE /batch — 批量删除
# ============================================================

@router.post("/batch-delete")
async def batch_delete_documents(
    body: BatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """批量删除知识条目"""
    # 查询属于当前用户的文档
    result = await db.execute(
        select(Document).where(Document.id.in_(body.ids), Document.user_id == user.id)
    )
    docs = result.scalars().all()

    # 删除文件
    for doc in docs:
        if doc.file_key:
            await file_storage.delete_file(doc.file_key)
        await db.delete(doc)

    await db.flush()
    logger.info(f"批量删除完成: {len(docs)} 个文档")
    return {"deleted": len(docs)}


# ============================================================
# PATCH /batch/move — 批量移动
# ============================================================

@router.patch("/batch/move")
async def batch_move_documents(
    body: BatchMoveRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """批量移动文档到指定知识空间"""
    # 验证目标空间
    space_result = await db.execute(
        select(Space).where(Space.id == body.space_id, Space.user_id == user.id)
    )
    space = space_result.scalar_one_or_none()
    if not space:
        raise HTTPException(status_code=404, detail={"error": "SPACE_NOT_FOUND", "message": "目标知识空间不存在"})

    # 查询属于当前用户的文档
    result = await db.execute(
        select(Document).where(Document.id.in_(body.ids), Document.user_id == user.id)
    )
    docs = result.scalars().all()

    for doc in docs:
        doc.space_id = body.space_id

    await db.flush()
    logger.info(f"批量移动完成: {len(docs)} 个文档 -> space_id={body.space_id}")
    return {"moved": len(docs), "space_id": str(body.space_id), "space_name": space.name}


# ============================================================
# PATCH /:id/tags — 更新标签
# ============================================================

@router.patch("/{doc_id}/tags")
async def update_tags(
    doc_id: uuid.UUID,
    body: UpdateTagsRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """更新文档标签（添加/移除）"""
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(Document.id == doc_id, Document.user_id == user.id)
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "文档不存在"})

    # 移除标签
    if body.remove_tags:
        for tag in doc.tags[:]:
            if tag.label in body.remove_tags:
                await db.delete(tag)

    # 添加标签
    existing_labels = {t.label for t in doc.tags}
    for label in body.add_tags:
        if label not in existing_labels:
            new_tag = DocumentTag(document_id=doc_id, label=label, is_ai=False)
            db.add(new_tag)

    await db.flush()

    # 重新查询标签
    result = await db.execute(
        select(DocumentTag).where(DocumentTag.document_id == doc_id)
    )
    tags = result.scalars().all()

    return {
        "tags": [{"id": str(t.id), "label": t.label, "is_ai": t.is_ai} for t in tags]
    }


# ============================================================
# PATCH /:id/space — 移动到其他空间
# ============================================================

@router.patch("/{doc_id}/space")
async def move_document(
    doc_id: uuid.UUID,
    body: MoveDocumentRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """将文档移动到其他知识空间"""
    # 验证文档
    doc_result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == user.id)
    )
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "文档不存在"})

    # 验证目标空间
    space_result = await db.execute(
        select(Space).where(Space.id == body.space_id, Space.user_id == user.id)
    )
    space = space_result.scalar_one_or_none()
    if not space:
        raise HTTPException(status_code=404, detail={"error": "SPACE_NOT_FOUND", "message": "目标知识空间不存在"})

    doc.space_id = body.space_id
    await db.flush()

    return {"success": True, "spaceId": str(body.space_id), "spaceName": space.name}


# ============================================================
# GET /:id/related — 相关推荐
# ============================================================

@router.get("/{doc_id}/related", response_model=list[RelatedDocumentItem])
async def get_related_documents(
    doc_id: uuid.UUID,
    limit: int = Query(default=5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取与当前文档相关的其他文档（基于向量相似度）"""
    from app.services.vector_store import vector_store

    # 获取文档的第一个 chunk 的向量作为代表
    chunk_result = await db.execute(
        select(DocChunk)
        .where(DocChunk.document_id == doc_id, DocChunk.user_id == user.id)
        .order_by(DocChunk.chunk_index)
        .limit(1)
    )
    first_chunk = chunk_result.scalar_one_or_none()

    if not first_chunk or first_chunk.embedding is None:
        return []

    # 用第一个 chunk 的向量做相似度搜索
    results = await vector_store.similarity_search(
        db=db,
        query_embedding=list(first_chunk.embedding),
        user_id=user.id,
        top_k=limit + 5,  # 多取一些，排除自身
        score_threshold=0.3,
    )

    # 去重 + 排除自身文档
    seen_doc_ids = set()
    related = []
    for r in results:
        rid = r["document_id"]
        if rid == doc_id or rid in seen_doc_ids:
            continue
        seen_doc_ids.add(rid)
        related.append(RelatedDocumentItem(
            id=rid,
            title=r["document_title"],
            file_type=r["document_type"],
            relevance_score=r["similarity"],
        ))
        if len(related) >= limit:
            break

    return related
