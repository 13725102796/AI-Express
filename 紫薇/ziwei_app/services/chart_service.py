"""排盘业务逻辑：user profile → paipan → chart_data upsert."""
from __future__ import annotations

import asyncio
import uuid
from typing import Any, Callable, Dict, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.exceptions import ChartEngineError, ProfileNotFoundError
from ziwei_app.models.chart import ChartData
from ziwei_app.models.user import UserProfile
from ziwei_app.paipan.router import call_paipan_lunar_json, call_paipan_solar_json

# paipan 钩子：测试可 monkeypatch 这两个函数避免依赖 iztro
_LUNAR_CALLER: Callable[..., Tuple[dict, str]] = call_paipan_lunar_json
_SOLAR_CALLER: Callable[..., Tuple[dict, str]] = call_paipan_solar_json


def set_paipan_callers(
    lunar: Optional[Callable[..., Tuple[dict, str]]] = None,
    solar: Optional[Callable[..., Tuple[dict, str]]] = None,
) -> None:
    """测试用：注入自定义的排盘实现."""
    global _LUNAR_CALLER, _SOLAR_CALLER
    if lunar is not None:
        _LUNAR_CALLER = lunar
    if solar is not None:
        _SOLAR_CALLER = solar


def reset_paipan_callers() -> None:
    global _LUNAR_CALLER, _SOLAR_CALLER
    _LUNAR_CALLER = call_paipan_lunar_json
    _SOLAR_CALLER = call_paipan_solar_json


def _gender_to_cn(gender: str) -> str:
    return "男" if gender == "male" else "女"


def _compose_api_params(profile: UserProfile) -> Dict[str, Any]:
    """保存用于排盘的入参，便于后续重排和问题复现."""
    base: Dict[str, Any] = {
        "birth_type": profile.birth_type,
        "birth_year": profile.birth_year,
        "birth_month": profile.birth_month,
        "birth_day": profile.birth_day,
        "birth_time_index": profile.birth_time_index,
        "gender": profile.gender,
        "is_leap_month": profile.is_leap_month,
    }
    return base


async def _run_paipan(profile: UserProfile) -> Tuple[dict, str]:
    """同步排盘用 to_thread 包装 → 不阻塞事件循环."""
    gender_cn = _gender_to_cn(profile.gender)
    try:
        if profile.birth_type == "lunar":
            return await asyncio.to_thread(
                _LUNAR_CALLER,
                profile.birth_year,
                profile.birth_month,
                profile.birth_day,
                profile.birth_time_index,
                gender_cn,
                bool(profile.is_leap_month),
            )
        date_str = f"{profile.birth_year}-{profile.birth_month}-{profile.birth_day}"
        return await asyncio.to_thread(
            _SOLAR_CALLER, date_str, profile.birth_time_index, gender_cn
        )
    except Exception as exc:  # iztro 内部错误统一包装
        raise ChartEngineError(message=f"排盘引擎异常：{exc}") from exc


async def generate_chart_for_user(
    db: AsyncSession, user_id: uuid.UUID
) -> ChartData:
    """读取 user_profile → 排盘 → upsert chart_data 并返回."""
    profile = (
        await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    ).scalar_one_or_none()
    if not profile:
        raise ProfileNotFoundError()

    chart_json, chart_text = await _run_paipan(profile)
    api_params = _compose_api_params(profile)

    existing = (
        await db.execute(
            select(ChartData).where(ChartData.user_id == user_id).with_for_update()
        )
    ).scalar_one_or_none()

    if existing:
        existing.profile_id = profile.id
        existing.chart_json = chart_json
        existing.chart_text = chart_text
        existing.api_params = api_params
        chart = existing
    else:
        chart = ChartData(
            id=uuid.uuid4(),
            user_id=user_id,
            profile_id=profile.id,
            chart_json=chart_json,
            chart_text=chart_text,
            api_params=api_params,
        )
        db.add(chart)

    await db.flush()
    return chart


async def get_chart_by_user(db: AsyncSession, user_id: uuid.UUID) -> Optional[ChartData]:
    return (
        await db.execute(select(ChartData).where(ChartData.user_id == user_id))
    ).scalar_one_or_none()
