"""
M5: 知识空间路由
- GET    /api/spaces           列表
- POST   /api/spaces           创建
- PATCH  /api/spaces/:id       更新
- DELETE /api/spaces/:id       删除
- GET    /api/spaces/:id/stats 统计
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.database import get_db
from app.dependencies import get_current_user
from app.models.database import User, Space, Document
from app.models.schemas import (
    CreateSpaceRequest, UpdateSpaceRequest,
    SpaceResponse, SpaceListResponse, SpaceStatsResponse,
)

router = APIRouter()

FREE_SPACE_LIMIT = 3


# ============================================================
# GET / — 空间列表
# ============================================================

@router.get("", response_model=SpaceListResponse)
async def list_spaces(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取用户的所有知识空间"""
    result = await db.execute(
        select(Space).where(Space.user_id == user.id).order_by(Space.created_at)
    )
    spaces = result.scalars().all()

    items = []
    for space in spaces:
        # 统计文档数和存储量
        count_result = await db.execute(
            select(func.count(), func.coalesce(func.sum(Document.file_size), 0))
            .where(Document.space_id == space.id)
        )
        row = count_result.one()
        doc_count = row[0]
        total_size_bytes = row[1]

        items.append(SpaceResponse(
            id=space.id,
            name=space.name,
            description=space.description,
            doc_count=doc_count,
            total_size_mb=round(total_size_bytes / (1024 * 1024), 2) if total_size_bytes else 0.0,
            created_at=space.created_at,
            updated_at=space.updated_at,
        ))

    # 配额信息
    plan = user.plan or "free"
    space_limit = FREE_SPACE_LIMIT if plan == "free" else 999

    return SpaceListResponse(
        items=items,
        quota={"used": len(items), "limit": space_limit, "plan": plan},
    )


# ============================================================
# POST / — 创建空间
# ============================================================

@router.post("", status_code=201)
async def create_space(
    body: CreateSpaceRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """创建新的知识空间。免费版最多 3 个。"""
    # 检查配额
    count_result = await db.execute(
        select(func.count()).where(Space.user_id == user.id)
    )
    current_count = count_result.scalar() or 0

    plan = user.plan or "free"
    if plan == "free" and current_count >= FREE_SPACE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "QUOTA_EXCEEDED", "message": f"免费版最多创建 {FREE_SPACE_LIMIT} 个知识空间，升级解锁更多"},
        )

    space = Space(
        user_id=user.id,
        name=body.name,
        description=body.description,
    )
    db.add(space)
    await db.flush()

    logger.info(f"知识空间已创建: {space.name} (space_id={space.id})")
    return SpaceResponse(
        id=space.id,
        name=space.name,
        description=space.description,
        doc_count=0,
        total_size_mb=0.0,
        created_at=space.created_at,
        updated_at=space.updated_at,
    )


# ============================================================
# PATCH /:id — 更新空间
# ============================================================

@router.patch("/{space_id}")
async def update_space(
    space_id: uuid.UUID,
    body: UpdateSpaceRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """更新知识空间名称或描述"""
    result = await db.execute(
        select(Space).where(Space.id == space_id, Space.user_id == user.id)
    )
    space = result.scalar_one_or_none()

    if not space:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "知识空间不存在"})

    if body.name is not None:
        space.name = body.name
    if body.description is not None:
        space.description = body.description

    await db.flush()
    return {"success": True}


# ============================================================
# DELETE /:id — 删除空间
# ============================================================

@router.delete("/{space_id}")
async def delete_space(
    space_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """删除知识空间及其内所有文档"""
    result = await db.execute(
        select(Space).where(Space.id == space_id, Space.user_id == user.id)
    )
    space = result.scalar_one_or_none()

    if not space:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "知识空间不存在"})

    # 统计被删除的文档数
    doc_count_result = await db.execute(
        select(func.count()).where(Document.space_id == space_id)
    )
    deleted_doc_count = doc_count_result.scalar() or 0

    # 级联删除空间和文档
    await db.delete(space)
    await db.flush()

    logger.info(f"知识空间已删除: {space.name} (包含 {deleted_doc_count} 个文档)")
    return {"success": True, "deletedDocCount": deleted_doc_count}


# ============================================================
# GET /:id/stats — 空间统计
# ============================================================

@router.get("/{space_id}/stats", response_model=SpaceStatsResponse)
async def get_space_stats(
    space_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取知识空间的统计信息"""
    result = await db.execute(
        select(Space).where(Space.id == space_id, Space.user_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "知识空间不存在"})

    # 文档数和总大小
    count_result = await db.execute(
        select(func.count(), func.coalesce(func.sum(Document.file_size), 0))
        .where(Document.space_id == space_id)
    )
    row = count_result.one()
    doc_count = row[0]
    total_size_bytes = row[1]

    # 文件类型分布
    type_result = await db.execute(
        select(Document.file_type, func.count())
        .where(Document.space_id == space_id)
        .group_by(Document.file_type)
    )
    type_distribution = {row[0]: row[1] for row in type_result.all()}

    return SpaceStatsResponse(
        doc_count=doc_count,
        total_size_mb=round(total_size_bytes / (1024 * 1024), 2) if total_size_bytes else 0.0,
        file_type_distribution=type_distribution,
    )
