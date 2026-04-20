"""默认积分配置种子（PRD 6.1 完整 14 项）."""
from __future__ import annotations

DEFAULT_POINTS_CONFIG: list[tuple[str, int, str]] = [
    ("register_bonus", 100, "注册赠送积分"),
    ("checkin_day_1", 5, "连续签到第 1 天"),
    ("checkin_day_2", 8, "连续签到第 2 天"),
    ("checkin_day_3", 10, "连续签到第 3 天"),
    ("checkin_day_4", 12, "连续签到第 4 天"),
    ("checkin_day_5", 15, "连续签到第 5 天"),
    ("checkin_day_6", 18, "连续签到第 6 天"),
    ("checkin_day_7", 20, "连续签到第 7 天及以后"),
    ("share_reward", 10, "分享奖励"),
    ("share_daily_limit", 3, "每日分享次数上限"),
    ("ad_reward", 20, "广告奖励"),
    ("ad_daily_limit", 5, "每日广告次数上限"),
    ("invite_reward", 50, "邀请新用户奖励"),
    ("reading_cost", 10, "单次 AI 解读消耗"),
]
