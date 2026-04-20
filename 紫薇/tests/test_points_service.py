"""points_service 纯逻辑单元测试（TX_TYPES 校验 / 异常路径）."""
from __future__ import annotations

import asyncio
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from ziwei_app.core.exceptions import (
    AdTokenInvalidError,
    InsufficientPointsError,
)
from ziwei_app.services import points_service


def test_tx_types_covers_shared_types_enum():
    # 与 shared-types.md §1 的 PointsTxType 枚举一致
    expected = {
        "register_bonus", "daily_checkin", "share_reward", "ad_reward",
        "invite_reward", "unlock_template", "ai_reading", "refund",
    }
    assert points_service.TX_TYPES == expected


def test_change_points_rejects_unknown_type():
    db = AsyncMock()
    with pytest.raises(ValueError):
        asyncio.run(
            points_service.change_points(
                db, uuid.uuid4(), 10, "unknown_type"
            )
        )


def test_grant_ad_reward_rejects_empty_token():
    db = AsyncMock()
    # get_config_value 读取 ad_daily_limit 会被调用，mock 返回值
    with pytest.raises(AdTokenInvalidError):
        asyncio.run(
            points_service.grant_ad_reward(db, uuid.uuid4(), "")
        )


def test_change_points_insufficient_balance_raises():
    """模拟扣到负数。"""
    user = MagicMock()
    user.points_balance = 5

    scalar_one = MagicMock(return_value=user)
    exec_result = MagicMock()
    exec_result.scalar_one = scalar_one

    db = AsyncMock()
    db.execute = AsyncMock(return_value=exec_result)

    with pytest.raises(InsufficientPointsError):
        asyncio.run(
            points_service.change_points(
                db, uuid.uuid4(), -10, "ai_reading", description="解读"
            )
        )


def test_change_points_allow_negative_when_flag_set():
    """allow_negative_balance=True 时允许扣到负数（内部退款场景预留）."""
    user = MagicMock()
    user.points_balance = 0

    scalar_one = MagicMock(return_value=user)
    exec_result = MagicMock()
    exec_result.scalar_one = scalar_one

    db = AsyncMock()
    db.execute = AsyncMock(return_value=exec_result)
    db.add = MagicMock()
    db.flush = AsyncMock()

    bal, tx = asyncio.run(
        points_service.change_points(
            db, uuid.uuid4(), -5, "ai_reading",
            allow_negative_balance=True, description="强制扣",
        )
    )
    assert bal == -5
    assert tx.amount == -5
    assert tx.type == "ai_reading"
    db.add.assert_called_once()


def test_change_points_positive_amount_updates_balance():
    user = MagicMock()
    user.points_balance = 100

    scalar_one = MagicMock(return_value=user)
    exec_result = MagicMock()
    exec_result.scalar_one = scalar_one

    db = AsyncMock()
    db.execute = AsyncMock(return_value=exec_result)
    db.add = MagicMock()
    db.flush = AsyncMock()

    bal, tx = asyncio.run(
        points_service.change_points(
            db, uuid.uuid4(), 50, "register_bonus", description="注册"
        )
    )
    assert bal == 150
    assert user.points_balance == 150
    assert tx.amount == 50
    assert tx.balance_after == 150
