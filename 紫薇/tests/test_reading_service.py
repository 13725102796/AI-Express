"""reading_service 逻辑单元测试（mock DB / gemini）."""
from __future__ import annotations

import asyncio
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from ziwei_app.core.exceptions import (
    ChartDataMissingError,
    ReadingPointsInsufficientError,
    TemplateNotUnlockedError,
)
from ziwei_app.services import reading_service


def _exec_scalar_one_or_none(val):
    r = MagicMock()
    r.scalar_one_or_none = MagicMock(return_value=val)
    return r


def _exec_scalar_one(val):
    r = MagicMock()
    r.scalar_one = MagicMock(return_value=val)
    return r


def _make_user(balance=100, free_used=False):
    return SimpleNamespace(
        id=uuid.uuid4(),
        points_balance=balance,
        free_reading_used=free_used,
    )


def _make_template(cost=30, name="事业财禄"):
    return SimpleNamespace(
        id=uuid.uuid4(),
        name=name,
        points_cost=cost,
        prompt_content="用户信息：{{用户性别}}，{{用户出生信息}}\n命盘：{{排盘数据}}",
        status="active",
    )


def _make_chart(user):
    return SimpleNamespace(
        id=uuid.uuid4(),
        user_id=user.id,
        chart_text="命宫：紫微天府，三方四正...",
    )


def _make_profile(user, gender="male"):
    return SimpleNamespace(
        id=uuid.uuid4(),
        user_id=user.id,
        birth_type="solar",
        birth_year=1996,
        birth_month=5,
        birth_day=15,
        birth_time_index=6,
        gender=gender,
        is_leap_month=False,
        birth_place_province=None,
        birth_place_city=None,
    )


def test_prepare_reading_template_not_unlocked_raises():
    user = _make_user()
    tpl = _make_template(cost=30)
    # 模板付费且未解锁
    calls = []

    async def exec_side_effect(*_a, **_k):
        calls.append(1)
        if len(calls) == 1:
            return _exec_scalar_one_or_none(tpl)      # get_template
        if len(calls) == 2:
            return _exec_scalar_one_or_none(None)     # is_unlocked = False
        raise AssertionError("不应该调到更后面")

    db = AsyncMock()
    db.execute = AsyncMock(side_effect=exec_side_effect)

    with pytest.raises(TemplateNotUnlockedError):
        asyncio.run(reading_service.prepare_reading(db, user, tpl.id))


def test_prepare_reading_no_chart_raises():
    user = _make_user()
    tpl = _make_template(cost=0)  # 免费模板跳过解锁校验
    calls = []

    async def exec_side_effect(*_a, **_k):
        calls.append(1)
        if len(calls) == 1:
            return _exec_scalar_one_or_none(tpl)
        # 跳过 is_unlocked（免费模板不查）
        if len(calls) == 2:
            return _exec_scalar_one_or_none(None)     # chart → None
        raise AssertionError("不应该继续")

    db = AsyncMock()
    db.execute = AsyncMock(side_effect=exec_side_effect)

    with pytest.raises(ChartDataMissingError):
        asyncio.run(reading_service.prepare_reading(db, user, tpl.id))


def test_prepare_reading_insufficient_points_when_not_first_time():
    user = _make_user(balance=5, free_used=True)
    tpl = _make_template(cost=0)
    chart = _make_chart(user)
    calls = []

    async def exec_side_effect(*_a, **_k):
        calls.append(1)
        if len(calls) == 1:
            return _exec_scalar_one_or_none(tpl)
        if len(calls) == 2:
            return _exec_scalar_one_or_none(chart)     # chart
        if len(calls) == 3:
            # get_config_value(reading_cost) → 返回 cfg.value
            cfg = SimpleNamespace(value=10)
            return _exec_scalar_one_or_none(cfg)
        if len(calls) == 4:
            return _exec_scalar_one(user)             # with_for_update user
        raise AssertionError("超过预期调用")

    db = AsyncMock()
    db.execute = AsyncMock(side_effect=exec_side_effect)

    with pytest.raises(ReadingPointsInsufficientError):
        asyncio.run(reading_service.prepare_reading(db, user, tpl.id))


def test_prepare_reading_first_time_free_skips_deduction():
    user = _make_user(balance=5, free_used=False)
    tpl = _make_template(cost=0, name="命宫初探")
    chart = _make_chart(user)
    profile = _make_profile(user)

    calls = []

    async def exec_side_effect(*_a, **_k):
        calls.append(1)
        if len(calls) == 1:
            return _exec_scalar_one_or_none(tpl)
        if len(calls) == 2:
            return _exec_scalar_one_or_none(chart)
        if len(calls) == 3:
            cfg = SimpleNamespace(value=10)
            return _exec_scalar_one_or_none(cfg)
        if len(calls) == 4:
            return _exec_scalar_one(user)
        if len(calls) == 5:
            return _exec_scalar_one_or_none(profile)
        raise AssertionError("超出预期调用 N=%d" % len(calls))

    db = AsyncMock()
    db.execute = AsyncMock(side_effect=exec_side_effect)
    db.flush = AsyncMock()

    ctx = asyncio.run(reading_service.prepare_reading(db, user, tpl.id))
    assert ctx.is_free_use is True
    assert ctx.points_spent == 0
    assert ctx.balance_after == 5
    assert user.free_reading_used is True
    # prompt 必须完成占位符替换
    assert "{{用户性别}}" not in ctx.prompt
    assert "{{排盘数据}}" not in ctx.prompt
    assert "乾造" in ctx.prompt or "坤造" in ctx.prompt
    assert ctx.chart is chart
    assert ctx.template is tpl
    assert isinstance(ctx.report_id, uuid.UUID)


def test_refund_free_use_restores_flag_without_points_change():
    user = _make_user(balance=50, free_used=True)
    ctx = reading_service.ReadingContext(
        user_id=user.id,
        template=_make_template(),
        chart=_make_chart(user),
        prompt="",
        report_id=uuid.uuid4(),
        is_free_use=True,
        points_spent=0,
        balance_after=50,
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_exec_scalar_one(user))
    db.flush = AsyncMock()

    bal = asyncio.run(reading_service.refund(db, ctx))
    assert bal == 50
    assert user.free_reading_used is False


def test_refund_paid_returns_points():
    user = _make_user(balance=20, free_used=True)
    ctx = reading_service.ReadingContext(
        user_id=user.id,
        template=_make_template(),
        chart=_make_chart(user),
        prompt="",
        report_id=uuid.uuid4(),
        is_free_use=False,
        points_spent=10,
        balance_after=20,
    )
    # 第 1 次 execute → refund 里 with_for_update 取 user
    # 第 2 次 execute → change_points 里的 with_for_update 取 user（同一个 user 对象）
    calls = []

    async def exec_side_effect(*_a, **_k):
        calls.append(1)
        return _exec_scalar_one(user)

    db = AsyncMock()
    db.execute = AsyncMock(side_effect=exec_side_effect)
    db.add = MagicMock()
    db.flush = AsyncMock()

    bal = asyncio.run(reading_service.refund(db, ctx))
    assert bal == 30          # 20 + 10
    assert user.points_balance == 30
    # 写了一条 refund 流水
    assert db.add.call_count == 1


def test_excerpt_truncates_long_text():
    long = "一" * 150
    ex = reading_service.excerpt(long, 100)
    assert len(ex) == 101   # 100 + 省略号
    assert ex.endswith("…")


def test_excerpt_short_text_unchanged():
    assert reading_service.excerpt("你好", 100) == "你好"


def test_excerpt_empty_input():
    assert reading_service.excerpt("") == ""
    assert reading_service.excerpt(None) == ""
