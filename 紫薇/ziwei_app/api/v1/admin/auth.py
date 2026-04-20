"""admin 登录."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.db.session import get_db
from ziwei_app.schemas.admin import AdminBrief, AdminLoginReq, AdminLoginRespData
from ziwei_app.schemas.auth import AuthTokenPair
from ziwei_app.schemas.common import ApiResponse, ok
from ziwei_app.services import admin_service
from ziwei_app.utils.time import to_iso

router = APIRouter()


@router.post("/login", response_model=ApiResponse[AdminLoginRespData])
async def admin_login(
    body: AdminLoginReq,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[AdminLoginRespData]:
    admin, token, expires = await admin_service.admin_login(
        db, body.username, body.password
    )
    return ok(
        AdminLoginRespData(
            admin=AdminBrief(
                id=str(admin.id),
                username=admin.username,
                created_at=to_iso(admin.created_at) or "",
            ),
            tokens=AuthTokenPair(
                access_token=token,
                refresh_token=token,  # admin 不区分 access/refresh（PRD 简化）
                expires_in=expires,
            ),
        ),
        "登录成功",
    )
