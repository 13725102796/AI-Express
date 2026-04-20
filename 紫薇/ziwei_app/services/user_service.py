"""用户业务逻辑：me / profile CRUD（含触发排盘）."""
from __future__ import annotations

import calendar
import logging
import uuid
from typing import Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.exceptions import BirthDateOutOfRangeError
from ziwei_app.models.user import User, UserProfile
from ziwei_app.schemas.user import UpsertProfileReq, UserProfileOut
from ziwei_app.services import chart_service
from ziwei_app.utils.time import to_iso

logger = logging.getLogger(__name__)


def _profile_to_out(profile: UserProfile) -> UserProfileOut:
    return UserProfileOut(
        id=str(profile.id),
        user_id=str(profile.user_id),
        birth_type=profile.birth_type,
        birth_year=profile.birth_year,
        birth_month=profile.birth_month,
        birth_day=profile.birth_day,
        birth_time_index=profile.birth_time_index,
        gender=profile.gender,
        is_leap_month=profile.is_leap_month,
        birth_place_province=profile.birth_place_province,
        birth_place_city=profile.birth_place_city,
        created_at=to_iso(profile.created_at) or "",
        updated_at=to_iso(profile.updated_at) or "",
    )


def _validate_birth(req: UpsertProfileReq) -> None:
    """阳历需校验真实日期合法性；农历合法性由排盘引擎兜底."""
    if req.birth_type == "solar":
        try:
            max_day = calendar.monthrange(req.birth_year, req.birth_month)[1]
            if not 1 <= req.birth_day <= max_day:
                raise BirthDateOutOfRangeError(
                    message=f"阳历 {req.birth_year}年{req.birth_month}月 没有 {req.birth_day} 日"
                )
        except ValueError as e:
            raise BirthDateOutOfRangeError(message=str(e))


async def get_user_profile(
    db: AsyncSession, user_id: uuid.UUID
) -> Optional[UserProfile]:
    return (
        await db.execute(
            select(UserProfile).where(UserProfile.user_id == user_id)
        )
    ).scalar_one_or_none()


async def upsert_user_profile(
    db: AsyncSession, user: User, req: UpsertProfileReq
) -> Tuple[UserProfile, bool]:
    """
    upsert 档案 → 触发排盘。
    返回 (profile, chart_generated)：排盘失败时 chart_generated=False，
    档案依然保留（缘主可之后重试 /chart/generate）。
    """
    _validate_birth(req)

    existing = await get_user_profile(db, user.id)
    if existing:
        existing.birth_type = req.birth_type
        existing.birth_year = req.birth_year
        existing.birth_month = req.birth_month
        existing.birth_day = req.birth_day
        existing.birth_time_index = req.birth_time_index
        existing.gender = req.gender
        existing.is_leap_month = req.is_leap_month
        existing.birth_place_province = req.birth_place_province
        existing.birth_place_city = req.birth_place_city
        profile = existing
    else:
        profile = UserProfile(
            id=uuid.uuid4(),
            user_id=user.id,
            birth_type=req.birth_type,
            birth_year=req.birth_year,
            birth_month=req.birth_month,
            birth_day=req.birth_day,
            birth_time_index=req.birth_time_index,
            gender=req.gender,
            is_leap_month=req.is_leap_month,
            birth_place_province=req.birth_place_province,
            birth_place_city=req.birth_place_city,
        )
        db.add(profile)
    await db.flush()

    # 排盘用 savepoint 保护：失败不影响 profile 保存
    chart_generated = True
    try:
        async with db.begin_nested():
            await chart_service.generate_chart_for_user(db, user.id)
    except Exception as exc:
        logger.warning("生成排盘失败（profile 已保存，用户可稍后重试）: %s", exc)
        chart_generated = False

    return profile, chart_generated
