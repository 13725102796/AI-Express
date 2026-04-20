"""签到业务逻辑：连续天数 + 按表分段奖励."""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from typing import Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.exceptions import CheckinAlreadyDoneError
from ziwei_app.models.points import CheckinRecord
from ziwei_app.services.points_service import change_points, get_config_value
from ziwei_app.utils.time import today_cst, yesterday_cst


def _reward_key_for_day(day_n: int) -> str:
    """
    连签第 n 天 → 配置 key。
    1-7 对应 checkin_day_1 ~ checkin_day_7；≥7 统一按 day_7 给。
    """
    capped = min(max(day_n, 1), 7)
    return f"checkin_day_{capped}"


async def get_consecutive_days(
    db: AsyncSession, user_id: uuid.UUID, today: date
) -> int:
    """
    推算"如果今天签到"的连续天数：
    - 若昨日有签到 → 昨日.consecutive_days + 1
    - 否则重置为 1
    """
    yesterday = today - timedelta(days=1)
    row = (
        await db.execute(
            select(CheckinRecord)
            .where(
                CheckinRecord.user_id == user_id,
                CheckinRecord.checkin_date == yesterday,
            )
        )
    ).scalar_one_or_none()
    return (row.consecutive_days + 1) if row else 1


async def get_today_record(
    db: AsyncSession, user_id: uuid.UUID, today: date
) -> CheckinRecord | None:
    return (
        await db.execute(
            select(CheckinRecord)
            .where(
                CheckinRecord.user_id == user_id,
                CheckinRecord.checkin_date == today,
            )
        )
    ).scalar_one_or_none()


async def do_checkin(
    db: AsyncSession, user_id: uuid.UUID
) -> Tuple[int, int, int]:
    """
    今日签到：
    1) 若今日已签 → raise CheckinAlreadyDoneError
    2) 计算连续天数 + 奖励
    3) 原子事务：插入 checkin + 加积分 + 写流水
    返回 (consecutive_days, points_earned, balance)
    """
    today = today_cst()

    if await get_today_record(db, user_id, today):
        raise CheckinAlreadyDoneError()

    consec = await get_consecutive_days(db, user_id, today)
    reward_key = _reward_key_for_day(consec)
    # 默认值：第 1-7 天递增 5/8/10/12/15/18/20
    default_map = {1: 5, 2: 8, 3: 10, 4: 12, 5: 15, 6: 18, 7: 20}
    reward = await get_config_value(db, reward_key, default_map[min(consec, 7)])

    record = CheckinRecord(
        id=uuid.uuid4(),
        user_id=user_id,
        checkin_date=today,
        consecutive_days=consec,
        points_earned=reward,
    )
    db.add(record)

    balance, _ = await change_points(
        db, user_id, reward, "daily_checkin",
        description=f"连续签到第 {consec} 天",
    )
    return consec, reward, balance


async def get_checkin_status(
    db: AsyncSession, user_id: uuid.UUID
) -> Tuple[bool, int, int, int]:
    """
    返回 (checked_in_today, consecutive_days, today_reward, next_reward)
    - today_reward：若今天尚未签到，则为今天签能拿多少；若今天已签，则为实际已拿
    - next_reward：明日连签可得
    - consecutive_days：若今天已签=今日的值；否则=若现在签可得的连续数
    """
    today = today_cst()
    today_rec = await get_today_record(db, user_id, today)

    default_map = {1: 5, 2: 8, 3: 10, 4: 12, 5: 15, 6: 18, 7: 20}

    if today_rec:
        checked = True
        consec = today_rec.consecutive_days
        today_reward = today_rec.points_earned
        # 明日连签 → 连续 +1
        next_day = consec + 1
        next_reward = await get_config_value(
            db, _reward_key_for_day(next_day), default_map[min(next_day, 7)]
        )
    else:
        checked = False
        consec = await get_consecutive_days(db, user_id, today)
        today_reward = await get_config_value(
            db, _reward_key_for_day(consec), default_map[min(consec, 7)]
        )
        next_reward = await get_config_value(
            db, _reward_key_for_day(consec + 1), default_map[min(consec + 1, 7)]
        )
    return checked, consec, today_reward, next_reward
