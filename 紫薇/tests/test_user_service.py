"""user_service 纯逻辑单元测试（不依赖 DB）."""
from __future__ import annotations

import pytest

from ziwei_app.core.exceptions import BirthDateOutOfRangeError
from ziwei_app.schemas.user import UpsertProfileReq
from ziwei_app.services import user_service


def _req(**kw):
    base = dict(
        birth_type="solar",
        birth_year=1996,
        birth_month=2,
        birth_day=15,
        birth_time_index=6,
        gender="male",
    )
    base.update(kw)
    return UpsertProfileReq(**base)


def test_validate_birth_solar_valid():
    # 2 月 29 日闰年正常
    user_service._validate_birth(_req(birth_year=2000, birth_month=2, birth_day=29))


def test_validate_birth_solar_invalid_feb_29():
    # 平年 2 月 29 日非法
    with pytest.raises(BirthDateOutOfRangeError):
        user_service._validate_birth(_req(birth_year=1999, birth_month=2, birth_day=29))


def test_validate_birth_solar_apr_31_invalid():
    # 4 月 31 日不存在
    with pytest.raises(BirthDateOutOfRangeError):
        user_service._validate_birth(_req(birth_month=4, birth_day=31))


def test_validate_birth_lunar_skips_calendar_check():
    # 农历校验由 iztro 兜底，这里放行即使日期看似非法
    user_service._validate_birth(_req(birth_type="lunar", birth_month=2, birth_day=30))
