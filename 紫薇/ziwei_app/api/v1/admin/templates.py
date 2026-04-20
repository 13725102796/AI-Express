"""admin 模板 CRUD."""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.deps import get_current_admin
from ziwei_app.core.exceptions import TemplateNotFoundError
from ziwei_app.db.session import get_db
from ziwei_app.models.admin import Admin
from ziwei_app.schemas.admin import (
    AdminCreateTemplateReq,
    AdminToggleStatusReq,
    AdminUpdateTemplateReq,
)
from ziwei_app.schemas.common import ApiResponse, Paginated, ok
from ziwei_app.schemas.template import PromptTemplateOut
from ziwei_app.services import admin_service
from ziwei_app.utils.time import to_iso

router = APIRouter()


def _tpl_to_admin_out(tpl) -> PromptTemplateOut:
    return PromptTemplateOut(
        id=str(tpl.id),
        name=tpl.name,
        description=tpl.description,
        detail=tpl.detail,
        prompt_content=tpl.prompt_content,   # admin 端返回完整 prompt
        tags=list(tpl.tags or []),
        points_cost=tpl.points_cost,
        preview_image_url=tpl.preview_image_url,
        status=tpl.status,
        unlock_count=tpl.unlock_count,
        sort_order=tpl.sort_order,
        created_at=to_iso(tpl.created_at) or "",
        updated_at=to_iso(tpl.updated_at) or "",
    )


@router.get("", response_model=ApiResponse[Paginated[PromptTemplateOut]])
async def list_templates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="active / inactive / deleted / all"),
    _admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Paginated[PromptTemplateOut]]:
    rows, total = await admin_service.admin_list_templates(
        db, page=page, page_size=page_size, status=status,
    )
    return ok(
        Paginated[PromptTemplateOut](
            items=[_tpl_to_admin_out(t) for t in rows],
            total=total,
            page=page,
            page_size=page_size,
        )
    )


@router.post("", response_model=ApiResponse[PromptTemplateOut])
async def create_template(
    body: AdminCreateTemplateReq,
    _admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[PromptTemplateOut]:
    tpl = await admin_service.admin_create_template(db, body.model_dump())
    return ok(_tpl_to_admin_out(tpl), "模板已创建")


@router.put("/{template_id}", response_model=ApiResponse[PromptTemplateOut])
async def update_template(
    template_id: str,
    body: AdminUpdateTemplateReq,
    _admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[PromptTemplateOut]:
    try:
        tid = uuid.UUID(template_id)
    except ValueError:
        raise TemplateNotFoundError()
    tpl = await admin_service.admin_update_template(
        db, tid, body.model_dump(exclude_none=True)
    )
    return ok(_tpl_to_admin_out(tpl), "模板已更新")


@router.patch("/{template_id}/status", response_model=ApiResponse[PromptTemplateOut])
async def toggle_status(
    template_id: str,
    body: AdminToggleStatusReq,
    _admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[PromptTemplateOut]:
    try:
        tid = uuid.UUID(template_id)
    except ValueError:
        raise TemplateNotFoundError()
    tpl = await admin_service.admin_toggle_status(db, tid, body.status)
    return ok(_tpl_to_admin_out(tpl), f"状态已改为 {body.status}")


@router.delete("/{template_id}", response_model=ApiResponse[dict])
async def delete_template(
    template_id: str,
    _admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[dict]:
    try:
        tid = uuid.UUID(template_id)
    except ValueError:
        raise TemplateNotFoundError()
    await admin_service.admin_delete_template(db, tid)
    return ok({"ok": True}, "已删除（软删）")
