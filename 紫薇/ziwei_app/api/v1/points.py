"""积分 API 路由：余额 / 流水 / 签到 / 签到状态 / 分享奖励 / 广告奖励."""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.deps import get_current_user
from ziwei_app.db.session import get_db
from ziwei_app.models.user import User
from ziwei_app.schemas.common import ApiResponse, Paginated, ok
from ziwei_app.schemas.points import (
    AdRewardReq,
    BalanceOut,
    CheckinRespData,
    CheckinStatusOut,
    PointsTransactionOut,
    RewardRespData,
    ShareRewardReq,
)
from ziwei_app.services import checkin_service, points_service
from ziwei_app.utils.time import to_iso

router = APIRouter()


def _tx_to_out(tx) -> PointsTransactionOut:
    return PointsTransactionOut(
        id=str(tx.id),
        user_id=str(tx.user_id),
        type=tx.type,
        amount=tx.amount,
        balance_after=tx.balance_after,
        reference_id=str(tx.reference_id) if tx.reference_id else None,
        description=tx.description,
        created_at=to_iso(tx.created_at) or "",
    )


@router.get("/balance", response_model=ApiResponse[BalanceOut])
async def get_balance(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[BalanceOut]:
    bal = await points_service.get_balance(db, user.id)
    return ok(BalanceOut(balance=bal))


@router.get("/transactions", response_model=ApiResponse[Paginated[PointsTransactionOut]])
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Paginated[PointsTransactionOut]]:
    rows, total = await points_service.list_transactions(
        db, user.id, page=page, page_size=page_size, type_=type,
    )
    data = Paginated[PointsTransactionOut](
        items=[_tx_to_out(t) for t in rows],
        total=total,
        page=page,
        page_size=page_size,
    )
    return ok(data)


@router.post("/checkin", response_model=ApiResponse[CheckinRespData])
async def checkin(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[CheckinRespData]:
    consec, earned, bal = await checkin_service.do_checkin(db, user.id)
    return ok(
        CheckinRespData(consecutive_days=consec, points_earned=earned, balance=bal),
        "签到成功",
    )


@router.get("/checkin/status", response_model=ApiResponse[CheckinStatusOut])
async def checkin_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[CheckinStatusOut]:
    checked, consec, today_reward, next_reward = await checkin_service.get_checkin_status(
        db, user.id
    )
    return ok(
        CheckinStatusOut(
            checked_in_today=checked,
            consecutive_days=consec,
            today_reward=today_reward,
            next_reward=next_reward,
        )
    )


@router.post("/share-reward", response_model=ApiResponse[RewardRespData])
async def share_reward(
    body: ShareRewardReq,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[RewardRespData]:
    ref = uuid.UUID(body.report_id) if body.report_id else None
    earned, bal, remain = await points_service.grant_share_reward(db, user.id, ref)
    return ok(RewardRespData(points_earned=earned, balance=bal, remaining_today=remain))


@router.post("/ad-reward", response_model=ApiResponse[RewardRespData])
async def ad_reward(
    body: AdRewardReq,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[RewardRespData]:
    earned, bal, remain = await points_service.grant_ad_reward(db, user.id, body.ad_token)
    return ok(RewardRespData(points_earned=earned, balance=bal, remaining_today=remain))
