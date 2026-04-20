"""积分模块 schemas — 与 shared-types.md §3.4 对齐."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────
# 业务实体
# ──────────────────────────────────────────────

class PointsTransactionOut(BaseModel):
    id: str
    user_id: str
    type: str
    amount: int
    balance_after: int
    reference_id: Optional[str] = None
    description: Optional[str] = None
    created_at: str


class PaginatedTx(BaseModel):
    items: List[PointsTransactionOut]
    total: int
    page: int
    page_size: int


class CheckinStatusOut(BaseModel):
    checked_in_today: bool
    consecutive_days: int
    today_reward: int
    next_reward: int


# ──────────────────────────────────────────────
# Request
# ──────────────────────────────────────────────

class ShareRewardReq(BaseModel):
    report_id: Optional[str] = None


class AdRewardReq(BaseModel):
    ad_token: str = Field(..., min_length=1)


# ──────────────────────────────────────────────
# Response Data
# ──────────────────────────────────────────────

class BalanceOut(BaseModel):
    balance: int


class CheckinRespData(BaseModel):
    consecutive_days: int
    points_earned: int
    balance: int


class RewardRespData(BaseModel):
    points_earned: int
    balance: int
    remaining_today: int
