"""模板业务逻辑：列表 / 详情 / 解锁事务 / 我的模板."""
from __future__ import annotations

import uuid
from typing import List, Optional, Tuple

from sqlalchemy import Text, and_, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.exceptions import (
    TemplateAlreadyUnlockedError,
    TemplateInsufficientPointsError,
    TemplateNotFoundError,
)
from ziwei_app.models.template import PromptTemplate, UserTemplate
from ziwei_app.models.user import User
from ziwei_app.services.points_service import change_points


# ──────────────────────────────────────────────
# 查询
# ──────────────────────────────────────────────

async def list_templates(
    db: AsyncSession,
    user_id: Optional[uuid.UUID] = None,
    page: int = 1,
    page_size: int = 20,
    tag: Optional[str] = None,
    include_inactive: bool = False,
) -> Tuple[List[PromptTemplate], int, set[uuid.UUID]]:
    """
    返回 (templates, total, unlocked_template_ids)。
    - 默认只返回 active 模板（C 端列表场景）
    - include_inactive=True 留给 admin 调用
    """
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    where = []
    if not include_inactive:
        where.append(PromptTemplate.status == "active")
    # tag 模糊过滤（PG 使用 JSONB ? 运算符；SQLite 不支持，这里退化为 LIKE）
    # 为兼容，统一用 cast(tags, TEXT) LIKE '%tag%' 的字符串搜索
    if tag:
        where.append(cast(PromptTemplate.tags, Text).ilike(f'%"{tag}"%'))

    total = int(
        (
            await db.execute(
                select(func.count())
                .select_from(PromptTemplate)
                .where(and_(*where)) if where else select(func.count()).select_from(PromptTemplate)
            )
        ).scalar_one() or 0
    )

    q = select(PromptTemplate)
    if where:
        q = q.where(and_(*where))
    q = q.order_by(PromptTemplate.sort_order.asc(), PromptTemplate.created_at.asc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()

    unlocked: set[uuid.UUID] = set()
    if user_id and rows:
        ids = [t.id for t in rows]
        ur = await db.execute(
            select(UserTemplate.template_id).where(
                UserTemplate.user_id == user_id,
                UserTemplate.template_id.in_(ids),
            )
        )
        unlocked = {row for row in ur.scalars().all()}
    return list(rows), total, unlocked


async def get_template(
    db: AsyncSession, template_id: uuid.UUID, include_inactive: bool = False
) -> PromptTemplate:
    t = (
        await db.execute(select(PromptTemplate).where(PromptTemplate.id == template_id))
    ).scalar_one_or_none()
    if not t:
        raise TemplateNotFoundError()
    if not include_inactive and t.status != "active":
        raise TemplateNotFoundError()
    return t


async def is_unlocked(
    db: AsyncSession, user_id: uuid.UUID, template_id: uuid.UUID
) -> bool:
    row = (
        await db.execute(
            select(UserTemplate.id).where(
                UserTemplate.user_id == user_id,
                UserTemplate.template_id == template_id,
            )
        )
    ).scalar_one_or_none()
    return row is not None


async def get_user_template(
    db: AsyncSession, user_id: uuid.UUID, template_id: uuid.UUID
) -> Optional[UserTemplate]:
    return (
        await db.execute(
            select(UserTemplate).where(
                UserTemplate.user_id == user_id,
                UserTemplate.template_id == template_id,
            )
        )
    ).scalar_one_or_none()


# ──────────────────────────────────────────────
# 解锁事务
# ──────────────────────────────────────────────

async def unlock_template(
    db: AsyncSession, user: User, template_id: uuid.UUID
) -> Tuple[UserTemplate, int]:
    """
    解锁事务：
      1) 模板存在且 active（否则 40003）
      2) 未解锁（否则 40001）
      3) 积分够（否则 40002）
      4) 行锁扣积分 + 写流水 unlock_template + 创建 user_template + template.unlock_count++
    返回 (user_template, balance)
    """
    tpl = await get_template(db, template_id)

    if await is_unlocked(db, user.id, template_id):
        raise TemplateAlreadyUnlockedError()

    cost = int(tpl.points_cost or 0)

    # 积分够：free 模板直接跳过扣费环节（cost=0 也走 change_points，不会扣负）
    if cost > 0 and user.points_balance < cost:
        raise TemplateInsufficientPointsError()

    if cost > 0:
        balance, _ = await change_points(
            db, user.id, -cost, "unlock_template",
            reference_id=template_id,
            description=f"解锁模板 {tpl.name}",
        )
    else:
        balance = int(user.points_balance)

    ut = UserTemplate(
        id=uuid.uuid4(),
        user_id=user.id,
        template_id=template_id,
        points_spent=cost,
    )
    db.add(ut)

    # unlock_count 原子+1（用 UPDATE ... SET unlock_count = unlock_count + 1）
    tpl.unlock_count = (tpl.unlock_count or 0) + 1

    await db.flush()
    return ut, balance


# ──────────────────────────────────────────────
# 我的模板
# ──────────────────────────────────────────────

async def list_my_templates(
    db: AsyncSession, user_id: uuid.UUID, page: int = 1, page_size: int = 20
) -> Tuple[List[Tuple[UserTemplate, PromptTemplate]], int]:
    page = max(1, page)
    page_size = max(1, min(100, page_size))

    total = int(
        (
            await db.execute(
                select(func.count())
                .select_from(UserTemplate)
                .where(UserTemplate.user_id == user_id)
            )
        ).scalar_one() or 0
    )
    rows = (
        await db.execute(
            select(UserTemplate, PromptTemplate)
            .join(PromptTemplate, PromptTemplate.id == UserTemplate.template_id)
            .where(UserTemplate.user_id == user_id)
            .order_by(UserTemplate.unlocked_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    # rows 是 (UserTemplate, PromptTemplate) 的 Row 列表
    return [(r[0], r[1]) for r in rows], total
