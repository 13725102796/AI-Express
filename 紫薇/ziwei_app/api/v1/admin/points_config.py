"""admin 积分配置."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.deps import get_current_admin
from ziwei_app.db.session import get_db
from ziwei_app.models.admin import Admin
from ziwei_app.schemas.admin import AdminUpdateConfigReq, PointsConfigItemOut
from ziwei_app.schemas.common import ApiResponse, ok
from ziwei_app.services import admin_service
from ziwei_app.utils.time import to_iso

router = APIRouter()


def _cfg_to_out(c) -> PointsConfigItemOut:
    return PointsConfigItemOut(
        id=str(c.id),
        key=c.key,
        value=c.value,
        description=c.description,
        updated_at=to_iso(c.updated_at) or "",
    )


@router.get("", response_model=ApiResponse[list[PointsConfigItemOut]])
async def list_configs(
    _admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[list[PointsConfigItemOut]]:
    rows = await admin_service.admin_get_points_configs(db)
    return ok([_cfg_to_out(r) for r in rows])


@router.put("/{key}", response_model=ApiResponse[PointsConfigItemOut])
async def update_config(
    key: str,
    body: AdminUpdateConfigReq,
    _admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[PointsConfigItemOut]:
    cfg = await admin_service.admin_update_points_config(db, key, body.value)
    return ok(_cfg_to_out(cfg), "配置已更新")
