"""admin 用户列表."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.deps import get_current_admin
from ziwei_app.core.security import decrypt_phone, mask_phone
from ziwei_app.db.session import get_db
from ziwei_app.models.admin import Admin
from ziwei_app.schemas.admin import AdminUserView
from ziwei_app.schemas.common import ApiResponse, Paginated, ok
from ziwei_app.services import admin_service
from ziwei_app.utils.time import to_iso

router = APIRouter()


def _mask_from_encrypted(enc: str) -> str:
    try:
        phone = decrypt_phone(enc)
        return mask_phone(phone)
    except Exception:
        return "***"


@router.get("", response_model=ApiResponse[Paginated[AdminUserView]])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    keyword: Optional[str] = Query(None),
    _admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Paginated[AdminUserView]]:
    rows, total = await admin_service.admin_list_users(
        db, page=page, page_size=page_size, keyword=keyword,
    )
    items = [
        AdminUserView(
            id=str(u.id),
            nickname=u.nickname or "",
            phone_masked=_mask_from_encrypted(u.phone_encrypted),
            points_balance=u.points_balance,
            invite_code=u.invite_code,
            invited_by=str(u.invited_by) if u.invited_by else None,
            free_reading_used=u.free_reading_used,
            has_profile=has_profile,
            reports_count=rc,
            unlocks_count=uc,
            created_at=to_iso(u.created_at) or "",
        )
        for u, has_profile, rc, uc in rows
    ]
    return ok(
        Paginated[AdminUserView](
            items=items, total=total, page=page, page_size=page_size,
        )
    )
