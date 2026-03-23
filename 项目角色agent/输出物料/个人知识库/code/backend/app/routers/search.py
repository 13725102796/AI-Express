"""
M3: 语义搜索路由
- GET /api/documents/search              语义搜索（返回匹配段落+高亮）
- GET /api/documents/search/suggestions  搜索建议（自动补全）
"""
import uuid
import time
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, literal_column
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.database import get_db
from app.dependencies import get_current_user
from app.models.database import User, Document, DocChunk
from app.models.schemas import SearchResponse, SearchResultItem, SearchSuggestResponse, SearchSuggestionItem
from app.services.embedding_service import embedding_service
from app.services.vector_store import vector_store

router = APIRouter()


def _highlight_text(text: str, query: str) -> str:
    """在文本中高亮匹配的关键词"""
    keywords = query.split()
    result = text
    for kw in keywords:
        if kw:
            pattern = re.compile(re.escape(kw), re.IGNORECASE)
            result = pattern.sub(f"<mark>{kw}</mark>", result)
    return result


@router.get("/search", response_model=SearchResponse)
@router.get("/documents/search", response_model=SearchResponse)
async def semantic_search(
    q: str = Query(min_length=1, max_length=1000),
    space_id: Optional[uuid.UUID] = Query(default=None),
    file_type: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    语义搜索接口。
    将用户查询向量化后在 pgvector 中进行相似度搜索，
    返回按相关度排序的匹配段落列表。
    """
    start_time = time.time()
    search_mode = "semantic"

    try:
        # 向量化查询
        query_embedding = await embedding_service.embed_text(q)

        # 向量相似度搜索
        results = await vector_store.similarity_search(
            db=db,
            query_embedding=query_embedding,
            user_id=user.id,
            space_id=space_id,
            top_k=limit * 2,  # 多取一些，后面可能需要按 file_type 过滤
            score_threshold=0.2,
        )

        # 按 file_type 过滤
        if file_type:
            results = [r for r in results if r["document_type"] == file_type]

        # 去重（同一文档可能有多个 chunk 命中，只保留最高分的）
        seen_docs = {}
        for r in results:
            doc_id = r["document_id"]
            if doc_id not in seen_docs or r["similarity"] > seen_docs[doc_id]["similarity"]:
                seen_docs[doc_id] = r
        unique_results = sorted(seen_docs.values(), key=lambda x: x["similarity"], reverse=True)

    except Exception as e:
        logger.warning(f"Embedding 服务不可用，降级到关键词搜索: {e}")
        search_mode = "keyword"

        # ---------- 关键词 fallback ----------
        from app.models.database import Space

        # 在 doc_chunks 中按 content ILIKE 搜索，按文档聚合命中数
        chunk_query = (
            select(
                DocChunk.document_id,
                func.count(DocChunk.id).label("hit_count"),
                func.max(DocChunk.content).label("sample_content"),
            )
            .join(Document, DocChunk.document_id == Document.id)
            .where(
                DocChunk.user_id == user.id,
                DocChunk.content.ilike(f"%{q}%"),
            )
        )
        if space_id:
            chunk_query = chunk_query.where(Document.space_id == space_id)
        if file_type:
            chunk_query = chunk_query.where(Document.file_type == file_type)
        chunk_query = chunk_query.group_by(DocChunk.document_id)

        # 同时在 documents 中按 title ILIKE 搜索
        title_query = (
            select(
                Document.id.label("document_id"),
                literal_column("0").label("hit_count"),
                literal_column("''").label("sample_content"),
            )
            .where(
                Document.user_id == user.id,
                Document.title.ilike(f"%{q}%"),
            )
        )
        if space_id:
            title_query = title_query.where(Document.space_id == space_id)
        if file_type:
            title_query = title_query.where(Document.file_type == file_type)

        # 合并两个来源，按 hit_count 降序（chunk 命中多的优先，title 命中的补充）
        union_q = chunk_query.union_all(title_query).subquery()
        merged_query = (
            select(
                union_q.c.document_id,
                func.sum(union_q.c.hit_count).label("total_hits"),
                func.max(union_q.c.sample_content).label("sample_content"),
            )
            .group_by(union_q.c.document_id)
            .order_by(func.sum(union_q.c.hit_count).desc())
        )
        merged_result = await db.execute(merged_query)
        rows = merged_result.all()

        # 转换为与语义搜索相同的 unique_results 结构
        unique_results = []
        for row in rows:
            doc_result = await db.execute(
                select(Document).where(Document.id == row.document_id)
            )
            doc = doc_result.scalar_one_or_none()
            if not doc:
                continue
            # 取 content 片段：优先用 chunk 中匹配的内容
            content_snippet = row.sample_content or doc.title
            unique_results.append({
                "document_id": doc.id,
                "document_title": doc.title,
                "document_type": doc.file_type,
                "content": content_snippet,
                "similarity": round(float(row.total_hits) / max(float(row.total_hits), 1.0), 4),
            })

    # 分页
    total = len(unique_results)
    offset = (page - 1) * limit
    paged_results = unique_results[offset:offset + limit]

    # 构建响应
    items = []
    for r in paged_results:
        # 获取空间名称
        space_name = None
        doc_result = await db.execute(
            select(Document).where(Document.id == r["document_id"])
        )
        doc = doc_result.scalar_one_or_none()
        if doc:
            from app.models.database import Space
            space_result = await db.execute(select(Space).where(Space.id == doc.space_id))
            space = space_result.scalar_one_or_none()
            space_name = space.name if space else None

        items.append(SearchResultItem(
            id=r["document_id"],
            title=r["document_title"],
            file_type=r["document_type"],
            matched_paragraph=_highlight_text(r["content"][:300], q),
            relevance_score=r["similarity"],
            space_name=space_name,
            created_at=doc.created_at if doc else None,
        ))

    elapsed = time.time() - start_time

    return SearchResponse(
        query=q,
        total=total,
        time_cost=f"{elapsed:.1f}s",
        results=items,
        has_more=(page * limit) < total,
        search_mode=search_mode,
    )


@router.get("/search/suggest", response_model=SearchSuggestResponse)
@router.get("/documents/search/suggestions", response_model=SearchSuggestResponse)
async def search_suggestions(
    q: str = Query(min_length=1, max_length=200),
    limit: int = Query(default=5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    搜索建议接口（debounce 自动补全）。
    根据用户输入的关键词前缀，从已有文档标题中匹配建议。
    """
    from app.models.database import DocumentTag

    suggestions: list[SearchSuggestionItem] = []

    # 1. 从文档标题中匹配
    title_result = await db.execute(
        select(Document.title)
        .where(Document.user_id == user.id, Document.title.ilike(f"%{q}%"))
        .order_by(Document.updated_at.desc())
        .limit(limit)
    )
    for row in title_result.scalars().all():
        suggestions.append(SearchSuggestionItem(text=row, type="document"))

    # 2. 从标签中匹配补充
    if len(suggestions) < limit:
        remaining = limit - len(suggestions)
        tag_result = await db.execute(
            select(DocumentTag.label)
            .join(Document, DocumentTag.document_id == Document.id)
            .where(Document.user_id == user.id, DocumentTag.label.ilike(f"%{q}%"))
            .distinct()
            .limit(remaining)
        )
        seen_texts = {s.text for s in suggestions}
        for label in tag_result.scalars().all():
            if label not in seen_texts:
                suggestions.append(SearchSuggestionItem(text=label, type="query"))

    return SearchSuggestResponse(suggestions=suggestions[:limit])
