"""用户 API 路由：/user/me、/user/profile(GET/PUT)、/user/templates（后者在 templates 中路由）."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.deps import get_current_user
from ziwei_app.db.session import get_db
from ziwei_app.models.user import User
from ziwei_app.schemas.auth import UserBrief
from ziwei_app.schemas.common import ApiResponse, ok
from ziwei_app.schemas.user import UpsertProfileReq, UpsertProfileRespData, UserProfileOut
from ziwei_app.services import auth_service, user_service

router = APIRouter()


@router.get("/me", response_model=ApiResponse[UserBrief])
async def get_me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[UserBrief]:
    brief = await auth_service._user_to_brief(db, user)
    return ok(brief)


@router.get("/profile", response_model=ApiResponse[UserProfileOut | None])
async def get_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[UserProfileOut | None]:
    profile = await user_service.get_user_profile(db, user.id)
    if not profile:
        return ok(None, "暂无档案")
    return ok(user_service._profile_to_out(profile))


@router.put("/profile", response_model=ApiResponse[UpsertProfileRespData])
async def upsert_profile(
    body: UpsertProfileReq,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[UpsertProfileRespData]:
    profile, chart_generated = await user_service.upsert_user_profile(db, user, body)
    data = UpsertProfileRespData(
        profile=user_service._profile_to_out(profile),
        chart_generated=chart_generated,
    )
    msg = "档案已保存" if chart_generated else "档案已保存，排盘生成失败请稍后重试"
    return ok(data, msg)
