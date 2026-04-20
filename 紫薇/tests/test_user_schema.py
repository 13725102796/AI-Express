"""用户档案 schema 校验单元测试."""
from __future__ import annotations

from datetime import datetime

import pytest
from pydantic import ValidationError

from ziwei_app.schemas.user import UpsertProfileReq


def _base_payload(**kw):
    p = dict(
        birth_type="solar",
        birth_year=1996,
        birth_month=5,
        birth_day=15,
        birth_time_index=6,
        gender="male",
        is_leap_month=False,
    )
    p.update(kw)
    return p


def test_upsert_profile_valid_solar():
    req = UpsertProfileReq(**_base_payload())
    assert req.birth_type == "solar"
    assert req.gender == "male"
    assert req.is_leap_month is False


def test_upsert_profile_valid_lunar_with_leap():
    req = UpsertProfileReq(**_base_payload(birth_type="lunar", is_leap_month=True))
    assert req.is_leap_month is True


def test_upsert_profile_invalid_birth_type():
    with pytest.raises(ValidationError):
        UpsertProfileReq(**_base_payload(birth_type="gregorian"))


def test_upsert_profile_invalid_gender():
    with pytest.raises(ValidationError):
        UpsertProfileReq(**_base_payload(gender="X"))


def test_upsert_profile_year_out_of_range():
    future_year = datetime.now().year + 5
    with pytest.raises(ValidationError):
        UpsertProfileReq(**_base_payload(birth_year=future_year))


def test_upsert_profile_year_too_old():
    with pytest.raises(ValidationError):
        UpsertProfileReq(**_base_payload(birth_year=1800))


def test_upsert_profile_month_out_of_range():
    with pytest.raises(ValidationError):
        UpsertProfileReq(**_base_payload(birth_month=13))


def test_upsert_profile_day_out_of_range():
    with pytest.raises(ValidationError):
        UpsertProfileReq(**_base_payload(birth_day=32))


def test_upsert_profile_time_index_out_of_range():
    with pytest.raises(ValidationError):
        UpsertProfileReq(**_base_payload(birth_time_index=13))


def test_upsert_profile_time_index_negative():
    with pytest.raises(ValidationError):
        UpsertProfileReq(**_base_payload(birth_time_index=-1))


def test_upsert_profile_place_optional():
    req = UpsertProfileReq(**_base_payload(birth_place_province="上海市", birth_place_city="浦东新区"))
    assert req.birth_place_province == "上海市"


def test_upsert_profile_place_too_long():
    with pytest.raises(ValidationError):
        UpsertProfileReq(**_base_payload(birth_place_province="x" * 33))
