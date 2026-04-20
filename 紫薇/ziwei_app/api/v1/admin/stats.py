"""admin 数据概览."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.deps import get_current_admin
from ziwei_app.db.session import get_db
from ziwei_app.models.admin import Admin
from ziwei_app.schemas.admin import AdminStatsOut, AdminStatsTop5
from ziwei_app.schemas.common import ApiResponse, ok
from ziwei_app.services import admin_service

router = APIRouter()


@router.get("", response_model=ApiResponse[AdminStatsOut])
async def stats(
    _admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[AdminStatsOut]:
    raw = await admin_service.admin_stats(db)
    return ok(
        AdminStatsOut(
            total_users=raw["total_users"],
            total_charts=raw["total_charts"],
            total_reports=raw["total_reports"],
            total_unlocks=raw["total_unlocks"],
            dau_today=raw["dau_today"],
            dau_7d=raw["dau_7d"],
            top5_templates=[AdminStatsTop5(**t) for t in raw["top5_templates"]],
        )
    )
