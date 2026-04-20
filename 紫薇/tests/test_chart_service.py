"""chart_service 单元测试（不依赖真实 DB，mock paipan 调用）."""
from __future__ import annotations

import asyncio
from types import SimpleNamespace

import pytest

from ziwei_app.core.exceptions import ChartEngineError
from ziwei_app.services import chart_service


@pytest.fixture(autouse=True)
def _reset_callers():
    chart_service.reset_paipan_callers()
    yield
    chart_service.reset_paipan_callers()


def _make_profile(birth_type="solar", leap=False):
    return SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        birth_type=birth_type,
        birth_year=1996,
        birth_month=5,
        birth_day=15,
        birth_time_index=6,
        gender="male",
        is_leap_month=leap,
    )


def test_run_paipan_solar_invokes_solar_caller():
    calls = {}

    def fake_solar(date, time_index, gender):
        calls["date"] = date
        calls["time_index"] = time_index
        calls["gender"] = gender
        return ({"palaces": []}, "tree-text")

    chart_service.set_paipan_callers(solar=fake_solar)
    profile = _make_profile(birth_type="solar")
    j, t = asyncio.run(chart_service._run_paipan(profile))
    assert j == {"palaces": []}
    assert t == "tree-text"
    assert calls["date"] == "1996-5-15"
    assert calls["time_index"] == 6
    assert calls["gender"] == "男"


def test_run_paipan_lunar_invokes_lunar_caller_with_leap():
    seen = {}

    def fake_lunar(year, month, day, time_index, gender, is_leap):
        seen.update(locals())
        return ({"ok": True}, "text")

    chart_service.set_paipan_callers(lunar=fake_lunar)
    profile = _make_profile(birth_type="lunar", leap=True)
    asyncio.run(chart_service._run_paipan(profile))
    assert seen["year"] == 1996
    assert seen["month"] == 5
    assert seen["day"] == 15
    assert seen["is_leap"] is True
    assert seen["gender"] == "男"


def test_run_paipan_maps_female_gender():
    got = {}

    def fake_solar(date, time_index, gender):
        got["gender"] = gender
        return ({}, "")

    chart_service.set_paipan_callers(solar=fake_solar)
    profile = _make_profile()
    profile.gender = "female"
    asyncio.run(chart_service._run_paipan(profile))
    assert got["gender"] == "女"


def test_run_paipan_wraps_exceptions_as_chart_engine_error():
    def boom(*_a, **_k):
        raise RuntimeError("iztro down")

    chart_service.set_paipan_callers(solar=boom, lunar=boom)
    profile = _make_profile()
    with pytest.raises(ChartEngineError):
        asyncio.run(chart_service._run_paipan(profile))


def test_compose_api_params_roundtrip():
    profile = _make_profile(birth_type="lunar", leap=True)
    params = chart_service._compose_api_params(profile)
    assert params["birth_type"] == "lunar"
    assert params["is_leap_month"] is True
    assert params["birth_month"] == 5
