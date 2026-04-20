"""template_service 单元测试（mock DB 覆盖分支 / 异常）."""
from __future__ import annotations

import asyncio
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from ziwei_app.core.exceptions import (
    TemplateAlreadyUnlockedError,
    TemplateInsufficientPointsError,
    TemplateNotFoundError,
)
from ziwei_app.services import template_service


def _mock_exec_scalar_one_or_none(val):
    """构造 AsyncMock execute 调用后 .scalar_one_or_none() 的 fake。"""
    res = MagicMock()
    res.scalar_one_or_none = MagicMock(return_value=val)
    return res


def _mock_exec_scalar_one(val):
    res = MagicMock()
    res.scalar_one = MagicMock(return_value=val)
    return res


def test_get_template_not_found_raises():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_mock_exec_scalar_one_or_none(None))
    with pytest.raises(TemplateNotFoundError):
        asyncio.run(template_service.get_template(db, uuid.uuid4()))


def test_get_template_inactive_raises_as_not_found():
    tpl = SimpleNamespace(id=uuid.uuid4(), status="inactive")
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_mock_exec_scalar_one_or_none(tpl))
    with pytest.raises(TemplateNotFoundError):
        asyncio.run(template_service.get_template(db, uuid.uuid4(), include_inactive=False))


def test_get_template_inactive_allowed_for_admin():
    tpl = SimpleNamespace(id=uuid.uuid4(), status="inactive")
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_mock_exec_scalar_one_or_none(tpl))
    result = asyncio.run(template_service.get_template(db, uuid.uuid4(), include_inactive=True))
    assert result is tpl


def test_unlock_template_raises_when_already_unlocked():
    tpl_id = uuid.uuid4()
    tpl = SimpleNamespace(id=tpl_id, status="active", points_cost=10, name="A", unlock_count=0)

    calls = []

    async def exec_side_effect(*_a, **_k):
        calls.append(1)
        # 第 1 次：get_template → 返回 tpl
        # 第 2 次：is_unlocked → 返回已存在 id
        if len(calls) == 1:
            return _mock_exec_scalar_one_or_none(tpl)
        return _mock_exec_scalar_one_or_none(uuid.uuid4())

    db = AsyncMock()
    db.execute = AsyncMock(side_effect=exec_side_effect)
    user = SimpleNamespace(id=uuid.uuid4(), points_balance=100)
    with pytest.raises(TemplateAlreadyUnlockedError):
        asyncio.run(template_service.unlock_template(db, user, tpl_id))


def test_unlock_template_raises_when_insufficient_points():
    tpl_id = uuid.uuid4()
    tpl = SimpleNamespace(id=tpl_id, status="active", points_cost=100, name="B", unlock_count=0)

    calls = []

    async def exec_side_effect(*_a, **_k):
        calls.append(1)
        if len(calls) == 1:
            return _mock_exec_scalar_one_or_none(tpl)
        return _mock_exec_scalar_one_or_none(None)  # is_unlocked → 未解锁

    db = AsyncMock()
    db.execute = AsyncMock(side_effect=exec_side_effect)
    user = SimpleNamespace(id=uuid.uuid4(), points_balance=50)
    with pytest.raises(TemplateInsufficientPointsError):
        asyncio.run(template_service.unlock_template(db, user, tpl_id))


def test_unlock_template_free_template_no_points_change():
    """免费模板（points_cost=0）解锁时不调用 change_points。"""
    tpl_id = uuid.uuid4()
    tpl = SimpleNamespace(id=tpl_id, status="active", points_cost=0, name="免费模板", unlock_count=3)

    calls = []

    async def exec_side_effect(*_a, **_k):
        calls.append(1)
        if len(calls) == 1:
            return _mock_exec_scalar_one_or_none(tpl)
        return _mock_exec_scalar_one_or_none(None)  # is_unlocked → 未解锁

    db = AsyncMock()
    db.execute = AsyncMock(side_effect=exec_side_effect)
    db.add = MagicMock()
    db.flush = AsyncMock()

    user = SimpleNamespace(id=uuid.uuid4(), points_balance=200)

    ut, bal = asyncio.run(template_service.unlock_template(db, user, tpl_id))

    assert ut.points_spent == 0
    assert bal == 200  # 免费模板不动余额
    assert tpl.unlock_count == 4  # +1
    db.add.assert_called_once()


def test_unlock_template_paid_deducts_points_and_increments_count():
    """付费模板解锁扣积分并计数 +1。"""
    tpl_id = uuid.uuid4()
    tpl = SimpleNamespace(id=tpl_id, status="active", points_cost=30, name="付费模板", unlock_count=5)

    # 模拟用户实体（change_points 会用 with_for_update 读锁）
    user_obj = SimpleNamespace(id=uuid.uuid4(), points_balance=100)

    calls = []

    async def exec_side_effect(*_a, **_k):
        calls.append(1)
        if len(calls) == 1:
            # get_template
            return _mock_exec_scalar_one_or_none(tpl)
        if len(calls) == 2:
            # is_unlocked
            return _mock_exec_scalar_one_or_none(None)
        # 第 3 次 → change_points 内部 select with_for_update
        return _mock_exec_scalar_one(user_obj)

    db = AsyncMock()
    db.execute = AsyncMock(side_effect=exec_side_effect)
    db.add = MagicMock()
    db.flush = AsyncMock()

    ut, bal = asyncio.run(template_service.unlock_template(db, user_obj, tpl_id))

    assert ut.points_spent == 30
    assert bal == 70
    assert user_obj.points_balance == 70
    assert tpl.unlock_count == 6
    # 两次 add：一次 user_template，一次 points_transaction（change_points 内）
    assert db.add.call_count == 2


def test_default_templates_seed_data_count():
    """种子 7 个模板，兜底确认数据不被误改."""
    from ziwei_app.seeds.templates import DEFAULT_TEMPLATES
    assert len(DEFAULT_TEMPLATES) == 7
    names = [t["name"] for t in DEFAULT_TEMPLATES]
    assert "命宫初探" in names
    assert "今日运势" in names
    # 免费模板 2 个
    free = [t for t in DEFAULT_TEMPLATES if t["points_cost"] == 0]
    assert len(free) == 2
