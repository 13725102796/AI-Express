"""模板 API 路由：列表 / 详情 / 解锁 / 我的模板（挂在 /user/templates）."""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.deps import get_current_user, get_optional_user
from ziwei_app.core.exceptions import TemplateNotFoundError
from ziwei_app.db.session import get_db
from ziwei_app.models.template import PromptTemplate, UserTemplate
from ziwei_app.models.user import User
from ziwei_app.schemas.common import ApiResponse, Paginated, ok
from ziwei_app.schemas.template import (
    PromptTemplateOut,
    UnlockTemplateRespData,
    UserTemplateOut,
)
from ziwei_app.services import template_service
from ziwei_app.utils.time import to_iso

# C 端公开模板路由（/api/v1/templates）
public_router = APIRouter()
# "我的模板"挂在 /api/v1/user/templates
user_tpl_router = APIRouter()


def _tpl_to_out(
    tpl: PromptTemplate,
    include_prompt: bool = False,
    is_unlocked: Optional[bool] = None,
) -> PromptTemplateOut:
    return PromptTemplateOut(
        id=str(tpl.id),
        name=tpl.name,
        description=tpl.description,
        detail=tpl.detail,
        prompt_content=tpl.prompt_content if include_prompt else None,
        tags=list(tpl.tags or []),
        points_cost=tpl.points_cost,
        preview_image_url=tpl.preview_image_url,
        status=tpl.status,
        unlock_count=tpl.unlock_count,
        sort_order=tpl.sort_order,
        created_at=to_iso(tpl.created_at) or "",
        updated_at=to_iso(tpl.updated_at) or "",
        is_unlocked=is_unlocked,
    )


def _user_tpl_to_out(
    ut: UserTemplate, tpl: Optional[PromptTemplate] = None
) -> UserTemplateOut:
    return UserTemplateOut(
        id=str(ut.id),
        user_id=str(ut.user_id),
        template_id=str(ut.template_id),
        template=_tpl_to_out(tpl, is_unlocked=True) if tpl else None,
        points_spent=ut.points_spent,
        unlocked_at=to_iso(ut.unlocked_at) or "",
    )


# ──────────────────────────────────────────────
# GET /api/v1/templates
# ──────────────────────────────────────────────

@public_router.get("", response_model=ApiResponse[Paginated[PromptTemplateOut]])
async def list_templates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tag: Optional[str] = Query(None),
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Paginated[PromptTemplateOut]]:
    rows, total, unlocked = await template_service.list_templates(
        db, user_id=user.id if user else None, page=page, page_size=page_size, tag=tag,
    )
    items = [
        _tpl_to_out(
            t,
            is_unlocked=(t.id in unlocked) if user else None,
        )
        for t in rows
    ]
    data = Paginated[PromptTemplateOut](
        items=items, total=total, page=page, page_size=page_size,
    )
    return ok(data)


# ──────────────────────────────────────────────
# GET /api/v1/templates/{id}
# ──────────────────────────────────────────────

@public_router.get("/{template_id}", response_model=ApiResponse[PromptTemplateOut])
async def get_template(
    template_id: str,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[PromptTemplateOut]:
    try:
        tid = uuid.UUID(template_id)
    except ValueError:
        raise TemplateNotFoundError()
    tpl = await template_service.get_template(db, tid)
    unlocked = None
    if user:
        unlocked = await template_service.is_unlocked(db, user.id, tid)
    return ok(_tpl_to_out(tpl, is_unlocked=unlocked))


# ──────────────────────────────────────────────
# POST /api/v1/templates/{id}/unlock
# ──────────────────────────────────────────────

@public_router.post("/{template_id}/unlock", response_model=ApiResponse[UnlockTemplateRespData])
async def unlock_template(
    template_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[UnlockTemplateRespData]:
    try:
        tid = uuid.UUID(template_id)
    except ValueError:
        raise TemplateNotFoundError()
    ut, bal = await template_service.unlock_template(db, user, tid)
    return ok(
        UnlockTemplateRespData(
            user_template=_user_tpl_to_out(ut),
            balance=bal,
        ),
        "解锁成功",
    )


# ──────────────────────────────────────────────
# GET /api/v1/user/templates
# ──────────────────────────────────────────────

@user_tpl_router.get("", response_model=ApiResponse[Paginated[UserTemplateOut]])
async def list_my_templates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Paginated[UserTemplateOut]]:
    pairs, total = await template_service.list_my_templates(
        db, user.id, page=page, page_size=page_size
    )
    items = [_user_tpl_to_out(ut, tpl) for ut, tpl in pairs]
    return ok(
        Paginated[UserTemplateOut](
            items=items, total=total, page=page, page_size=page_size,
        )
    )
