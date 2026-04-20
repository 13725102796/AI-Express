"""积分业务逻辑：余额变动（行锁）/ 流水查询 / 分享&广告奖励."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.exceptions import (
    AdRewardLimitError,
    InsufficientPointsError,
    ShareRewardLimitError,
)
from ziwei_app.models.points import PointsConfig, PointsTransaction
from ziwei_app.models.user import User
from ziwei_app.utils.time import now_cst, today_cst

# 合法流水类型枚举（与 shared-types.md PointsTxType 对齐）
TX_TYPES = {
    "register_bonus",
    "daily_checkin",
    "share_reward",
    "ad_reward",
    "invite_reward",
    "unlock_template",
    "ai_reading",
    "refund",
}


async def get_config_value(db: AsyncSession, key: str, default: int) -> int:
    cfg = (
        await db.execute(select(PointsConfig).where(PointsConfig.key == key))
    ).scalar_one_or_none()
    return cfg.value if cfg else default


async def change_points(
    db: AsyncSession,
    user_id: uuid.UUID,
    amount: int,
    type_: str,
    *,
    reference_id: Optional[uuid.UUID] = None,
    description: Optional[str] = None,
    allow_negative_balance: bool = False,
) -> Tuple[int, PointsTransaction]:
    """
    原子变动积分：FOR UPDATE 行锁 + 流水记录。

    - amount 正 = 加分，负 = 扣分
    - allow_negative_balance=False 时扣到负数抛 InsufficientPointsError
    - 调用方负责事务边界（通常在 api/v1 层通过 get_db 的 commit）
    """
    if type_ not in TX_TYPES:
        raise ValueError(f"未知的积分流水类型：{type_}")

    # 行锁读余额
    user = (
        await db.execute(select(User).where(User.id == user_id).with_for_update())
    ).scalar_one()

    new_balance = user.points_balance + amount
    if new_balance < 0 and not allow_negative_balance:
        raise InsufficientPointsError()

    user.points_balance = new_balance

    tx = PointsTransaction(
        id=uuid.uuid4(),
        user_id=user_id,
        type=type_,
        amount=amount,
        balance_after=new_balance,
        reference_id=reference_id,
        description=description,
    )
    db.add(tx)
    await db.flush()
    return new_balance, tx


async def get_balance(db: AsyncSession, user_id: uuid.UUID) -> int:
    value = (
        await db.execute(select(User.points_balance).where(User.id == user_id))
    ).scalar_one_or_none()
    return int(value or 0)


async def list_transactions(
    db: AsyncSession,
    user_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
    type_: Optional[str] = None,
) -> Tuple[List[PointsTransaction], int]:
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    where = [PointsTransaction.user_id == user_id]
    if type_:
        where.append(PointsTransaction.type == type_)

    total_q = await db.execute(
        select(func.count()).select_from(PointsTransaction).where(and_(*where))
    )
    total = int(total_q.scalar_one() or 0)

    rows = (
        await db.execute(
            select(PointsTransaction)
            .where(and_(*where))
            .order_by(PointsTransaction.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()
    return list(rows), total


async def _count_today_by_type(
    db: AsyncSession, user_id: uuid.UUID, type_: str
) -> int:
    """统计用户今天该 type 的流水条数（用于每日上限判断）."""
    today = today_cst()
    start = datetime(today.year, today.month, today.day).replace(tzinfo=now_cst().tzinfo)
    end = start + timedelta(days=1)
    q = await db.execute(
        select(func.count())
        .select_from(PointsTransaction)
        .where(
            and_(
                PointsTransaction.user_id == user_id,
                PointsTransaction.type == type_,
                PointsTransaction.created_at >= start,
                PointsTransaction.created_at < end,
            )
        )
    )
    return int(q.scalar_one() or 0)


async def grant_share_reward(
    db: AsyncSession, user_id: uuid.UUID, report_id: Optional[uuid.UUID] = None
) -> Tuple[int, int, int]:
    """分享奖励：检查每日上限后加积分。返回 (earned, balance, remaining_today)."""
    limit = await get_config_value(db, "share_daily_limit", 3)
    reward = await get_config_value(db, "share_reward", 10)

    used = await _count_today_by_type(db, user_id, "share_reward")
    if used >= limit:
        raise ShareRewardLimitError()

    balance, _ = await change_points(
        db, user_id, reward, "share_reward",
        reference_id=report_id, description="分享奖励",
    )
    remaining = max(0, limit - used - 1)
    return reward, balance, remaining


async def grant_ad_reward(
    db: AsyncSession, user_id: uuid.UUID, ad_token: str
) -> Tuple[int, int, int]:
    """广告奖励：检查 ad_token → 上限 → 加积分."""
    if not ad_token:
        from ziwei_app.core.exceptions import AdTokenInvalidError
        raise AdTokenInvalidError()

    limit = await get_config_value(db, "ad_daily_limit", 5)
    reward = await get_config_value(db, "ad_reward", 20)

    used = await _count_today_by_type(db, user_id, "ad_reward")
    if used >= limit:
        raise AdRewardLimitError()

    balance, _ = await change_points(
        db, user_id, reward, "ad_reward", description="广告奖励",
    )
    remaining = max(0, limit - used - 1)
    return reward, balance, remaining
