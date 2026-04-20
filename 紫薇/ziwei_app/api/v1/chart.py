"""排盘 API 路由：/chart/generate、/chart/me."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.deps import get_current_user
from ziwei_app.db.session import get_db
from ziwei_app.models.chart import ChartData
from ziwei_app.models.user import User
from ziwei_app.schemas.chart import ChartDataOut
from ziwei_app.schemas.common import ApiResponse, ok
from ziwei_app.services import chart_service
from ziwei_app.utils.time import to_iso

router = APIRouter()


def _chart_to_out(chart: ChartData) -> ChartDataOut:
    return ChartDataOut(
        id=str(chart.id),
        user_id=str(chart.user_id),
        profile_id=str(chart.profile_id),
        chart_json=chart.chart_json,
        chart_text=chart.chart_text,
        api_params=chart.api_params,
        created_at=to_iso(chart.created_at) or "",
    )


@router.post("/generate", response_model=ApiResponse[ChartDataOut])
async def generate(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[ChartDataOut]:
    chart = await chart_service.generate_chart_for_user(db, user.id)
    return ok(_chart_to_out(chart), "排盘成功")


@router.get("/me", response_model=ApiResponse[ChartDataOut | None])
async def get_my_chart(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[ChartDataOut | None]:
    chart = await chart_service.get_chart_by_user(db, user.id)
    if not chart:
        return ok(None, "暂无命盘，请先完善生辰档案")
    return ok(_chart_to_out(chart))
