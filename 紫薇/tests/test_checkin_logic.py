"""checkin_service 纯逻辑单元测试（无 DB）."""
from __future__ import annotations

import pytest

from ziwei_app.services import checkin_service


def test_reward_key_day_1():
    assert checkin_service._reward_key_for_day(1) == "checkin_day_1"


def test_reward_key_day_7():
    assert checkin_service._reward_key_for_day(7) == "checkin_day_7"


def test_reward_key_day_8_caps_at_7():
    # 第 8 天及以后统一按 day_7 给
    assert checkin_service._reward_key_for_day(8) == "checkin_day_7"
    assert checkin_service._reward_key_for_day(30) == "checkin_day_7"


def test_reward_key_day_less_than_1_clamps_to_1():
    assert checkin_service._reward_key_for_day(0) == "checkin_day_1"
    assert checkin_service._reward_key_for_day(-3) == "checkin_day_1"
