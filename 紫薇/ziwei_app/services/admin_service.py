"""管理后台业务逻辑：登录 / 模板 CRUD / 用户管理 / 积分配置 / 统计."""
from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.exceptions import (
    AdminUnauthorizedError,
    TemplateNameDuplicateError,
    TemplateNotFoundError,
)
from ziwei_app.core.security import create_admin_token, verify_password
from ziwei_app.models.admin import Admin
from ziwei_app.models.chart import ChartData
from ziwei_app.models.points import CheckinRecord, PointsConfig, PointsTransaction
from ziwei_app.models.reading import ReadingReport
from ziwei_app.models.template import PromptTemplate, UserTemplate
from ziwei_app.models.user import User, UserProfile
from ziwei_app.utils.time import today_cst


# ──────────────────────────────────────────────
# 登录
# ──────────────────────────────────────────────

async def admin_login(
    db: AsyncSession, username: str, password: str
) -> Tuple[Admin, str, int]:
    admin = (
        await db.execute(select(Admin).where(Admin.username == username))
    ).scalar_one_or_none()
    if not admin or not verify_password(password, admin.password_hash):
        raise AdminUnauthorizedError(message="账号或密码错误")
    token, expires = create_admin_token(str(admin.id))
    return admin, token, expires


# ──────────────────────────────────────────────
# 模板 CRUD
# ──────────────────────────────────────────────

async def admin_list_templates(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
) -> Tuple[List[PromptTemplate], int]:
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    where = []
    if status and status != "all":
        where.append(PromptTemplate.status == status)

    total_q = select(func.count()).select_from(PromptTemplate)
    if where:
        total_q = total_q.where(and_(*where))
    total = int((await db.execute(total_q)).scalar_one() or 0)

    q = select(PromptTemplate)
    if where:
        q = q.where(and_(*where))
    q = q.order_by(PromptTemplate.sort_order.asc(), PromptTemplate.created_at.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()
    return list(rows), total


async def admin_create_template(
    db: AsyncSession, data: Dict[str, Any]
) -> PromptTemplate:
    name = data["name"]
    dup = (
        await db.execute(select(PromptTemplate.id).where(PromptTemplate.name == name))
    ).scalar_one_or_none()
    if dup:
        raise TemplateNameDuplicateError()
    tpl = PromptTemplate(
        id=uuid.uuid4(),
        name=name,
        description=data["description"],
        detail=data["detail"],
        prompt_content=data["prompt_content"],
        tags=list(data.get("tags") or []),
        points_cost=int(data.get("points_cost") or 0),
        preview_image_url=data.get("preview_image_url"),
        sort_order=int(data.get("sort_order") or 0),
        status="active",
        unlock_count=0,
    )
    db.add(tpl)
    await db.flush()
    return tpl


async def admin_update_template(
    db: AsyncSession, template_id: uuid.UUID, patch: Dict[str, Any]
) -> PromptTemplate:
    tpl = (
        await db.execute(select(PromptTemplate).where(PromptTemplate.id == template_id))
    ).scalar_one_or_none()
    if not tpl:
        raise TemplateNotFoundError()
    # 若改名，要检查重名
    if "name" in patch and patch["name"] and patch["name"] != tpl.name:
        dup = (
            await db.execute(
                select(PromptTemplate.id).where(
                    PromptTemplate.name == patch["name"],
                    PromptTemplate.id != template_id,
                )
            )
        ).scalar_one_or_none()
        if dup:
            raise TemplateNameDuplicateError()
    for field in (
        "name", "description", "detail", "prompt_content",
        "tags", "points_cost", "preview_image_url", "sort_order",
    ):
        if field in patch and patch[field] is not None:
            setattr(tpl, field, patch[field])
    await db.flush()
    return tpl


async def admin_toggle_status(
    db: AsyncSession, template_id: uuid.UUID, status: str
) -> PromptTemplate:
    if status not in ("active", "inactive"):
        raise ValueError("status 必须为 active/inactive")
    tpl = (
        await db.execute(select(PromptTemplate).where(PromptTemplate.id == template_id))
    ).scalar_one_or_none()
    if not tpl:
        raise TemplateNotFoundError()
    tpl.status = status
    await db.flush()
    return tpl


async def admin_delete_template(
    db: AsyncSession, template_id: uuid.UUID
) -> None:
    """软删：status=deleted."""
    tpl = (
        await db.execute(select(PromptTemplate).where(PromptTemplate.id == template_id))
    ).scalar_one_or_none()
    if not tpl:
        raise TemplateNotFoundError()
    tpl.status = "deleted"
    await db.flush()


# ──────────────────────────────────────────────
# 用户管理
# ──────────────────────────────────────────────

async def admin_list_users(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    keyword: Optional[str] = None,
) -> Tuple[List[Tuple[User, bool, int, int]], int]:
    """
    返回 (rows, total)。
    rows 每行：(user, has_profile, reports_count, unlocks_count)
    keyword：模糊匹配 nickname（手机号加密后无法明文搜索，仅做昵称匹配；完整手机号搜索留给后续）
    """
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    where = []
    if keyword:
        where.append(User.nickname.ilike(f"%{keyword}%"))

    total_q = select(func.count()).select_from(User)
    if where:
        total_q = total_q.where(and_(*where))
    total = int((await db.execute(total_q)).scalar_one() or 0)

    q = select(User)
    if where:
        q = q.where(and_(*where))
    q = q.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    users = list((await db.execute(q)).scalars().all())

    rows: List[Tuple[User, bool, int, int]] = []
    for u in users:
        has_profile = (
            await db.execute(select(UserProfile.id).where(UserProfile.user_id == u.id))
        ).scalar_one_or_none() is not None
        reports_count = int(
            (
                await db.execute(
                    select(func.count())
                    .select_from(ReadingReport)
                    .where(ReadingReport.user_id == u.id)
                )
            ).scalar_one() or 0
        )
        unlocks_count = int(
            (
                await db.execute(
                    select(func.count())
                    .select_from(UserTemplate)
                    .where(UserTemplate.user_id == u.id)
                )
            ).scalar_one() or 0
        )
        rows.append((u, has_profile, reports_count, unlocks_count))
    return rows, total


# ──────────────────────────────────────────────
# 积分配置
# ──────────────────────────────────────────────

async def admin_get_points_configs(db: AsyncSession) -> List[PointsConfig]:
    rows = (
        await db.execute(select(PointsConfig).order_by(PointsConfig.key.asc()))
    ).scalars().all()
    return list(rows)


async def admin_update_points_config(
    db: AsyncSession, key: str, value: int
) -> PointsConfig:
    cfg = (
        await db.execute(select(PointsConfig).where(PointsConfig.key == key))
    ).scalar_one_or_none()
    if not cfg:
        from ziwei_app.core.exceptions import BizError
        raise BizError(message=f"未知的积分配置项：{key}", code=90003, http_status=400)
    cfg.value = int(value)
    await db.flush()
    return cfg


# ──────────────────────────────────────────────
# 统计
# ──────────────────────────────────────────────

async def admin_stats(db: AsyncSession) -> Dict[str, Any]:
    total_users = int(
        (await db.execute(select(func.count()).select_from(User))).scalar_one() or 0
    )
    total_charts = int(
        (await db.execute(select(func.count()).select_from(ChartData))).scalar_one() or 0
    )
    total_reports = int(
        (await db.execute(select(func.count()).select_from(ReadingReport))).scalar_one() or 0
    )
    total_unlocks = int(
        (await db.execute(select(func.count()).select_from(UserTemplate))).scalar_one() or 0
    )

    # DAU（签到数作为活跃代理指标，简化实现）
    today = today_cst()
    dau_today = int(
        (
            await db.execute(
                select(func.count(distinct(CheckinRecord.user_id))).where(
                    CheckinRecord.checkin_date == today
                )
            )
        ).scalar_one() or 0
    )
    dau_7d: List[int] = []
    for i in range(6, -1, -1):  # 7 天，包含今日
        d = today - timedelta(days=i)
        n = int(
            (
                await db.execute(
                    select(func.count(distinct(CheckinRecord.user_id))).where(
                        CheckinRecord.checkin_date == d
                    )
                )
            ).scalar_one() or 0
        )
        dau_7d.append(n)

    # Top5 模板
    top5_rows = (
        await db.execute(
            select(PromptTemplate.id, PromptTemplate.name, PromptTemplate.unlock_count)
            .where(PromptTemplate.status != "deleted")
            .order_by(PromptTemplate.unlock_count.desc())
            .limit(5)
        )
    ).all()
    top5 = [
        {"id": str(r[0]), "name": r[1], "unlock_count": int(r[2] or 0)}
        for r in top5_rows
    ]

    return {
        "total_users": total_users,
        "total_charts": total_charts,
        "total_reports": total_reports,
        "total_unlocks": total_unlocks,
        "dau_today": dau_today,
        "dau_7d": dau_7d,
        "top5_templates": top5,
    }
