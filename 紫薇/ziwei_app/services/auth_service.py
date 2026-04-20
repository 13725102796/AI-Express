"""认证业务逻辑：注册 / 登录 / Token 刷新."""
from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.exceptions import (
    InvalidCredentialsError,
    InviteCodeInvalidError,
    PhoneAlreadyRegisteredError,
)
from ziwei_app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    encrypt_phone,
    generate_invite_code,
    hash_password,
    hash_phone,
    mask_phone,
    verify_password,
)
from ziwei_app.models.points import PointsConfig, PointsTransaction
from ziwei_app.models.user import User, UserProfile
from ziwei_app.schemas.auth import AuthSuccessData, AuthTokenPair, UserBrief
from ziwei_app.utils.time import to_iso


async def _get_config_value(db: AsyncSession, key: str, default: int) -> int:
    cfg = (await db.execute(select(PointsConfig).where(PointsConfig.key == key))).scalar_one_or_none()
    return cfg.value if cfg else default


async def _user_to_brief(db: AsyncSession, user: User, raw_phone: Optional[str] = None) -> UserBrief:
    has_profile = (
        await db.execute(select(UserProfile.id).where(UserProfile.user_id == user.id))
    ).scalar_one_or_none() is not None
    phone_str = raw_phone or ""
    if not phone_str:
        from ziwei_app.core.security import decrypt_phone
        try:
            phone_str = decrypt_phone(user.phone_encrypted)
        except Exception:
            phone_str = "00000000000"
    return UserBrief(
        id=str(user.id),
        nickname=user.nickname or f"缘主{phone_str[-4:]}",
        avatar_url=user.avatar_url,
        phone_masked=mask_phone(phone_str),
        points_balance=user.points_balance,
        invite_code=user.invite_code,
        free_reading_used=user.free_reading_used,
        has_profile=has_profile,
        created_at=to_iso(user.created_at) or "",
    )


def _build_token_pair(user_id: str) -> AuthTokenPair:
    access, expires = create_access_token(user_id)
    refresh = create_refresh_token(user_id)
    return AuthTokenPair(access_token=access, refresh_token=refresh, expires_in=expires)


async def _generate_unique_invite_code(db: AsyncSession) -> str:
    for _ in range(20):
        code = generate_invite_code()
        exists = await db.execute(select(User.id).where(User.invite_code == code))
        if not exists.scalar_one_or_none():
            return code
    raise RuntimeError("生成邀请码失败：连续 20 次冲突")


async def register(
    db: AsyncSession, phone: str, password: str, invite_code: Optional[str] = None
) -> AuthSuccessData:
    # 1) 唯一性检查
    phone_h = hash_phone(phone)
    exists = await db.execute(select(User.id).where(User.phone_hash == phone_h))
    if exists.scalar_one_or_none():
        raise PhoneAlreadyRegisteredError()

    # 2) 邀请人查找（如果给了邀请码）
    inviter: Optional[User] = None
    if invite_code:
        inviter_q = await db.execute(select(User).where(User.invite_code == invite_code))
        inviter = inviter_q.scalar_one_or_none()
        if not inviter:
            raise InviteCodeInvalidError()

    # 3) 创建用户
    new_invite = await _generate_unique_invite_code(db)
    register_bonus = await _get_config_value(db, "register_bonus", 100)

    user = User(
        id=uuid.uuid4(),
        phone_encrypted=encrypt_phone(phone),
        phone_hash=phone_h,
        password_hash=hash_password(password),
        nickname=f"缘主{phone[-4:]}",
        points_balance=register_bonus,
        invite_code=new_invite,
        invited_by=inviter.id if inviter else None,
        free_reading_used=False,
    )
    db.add(user)
    await db.flush()

    # 4) 注册赠送积分流水
    db.add(PointsTransaction(
        user_id=user.id,
        type="register_bonus",
        amount=register_bonus,
        balance_after=register_bonus,
        description="注册赠送积分",
    ))

    # 5) 邀请人奖励（事务内）
    if inviter:
        invite_reward = await _get_config_value(db, "invite_reward", 50)
        # 行锁更新邀请人余额
        inviter_locked = (await db.execute(
            select(User).where(User.id == inviter.id).with_for_update()
        )).scalar_one()
        inviter_locked.points_balance += invite_reward
        db.add(PointsTransaction(
            user_id=inviter.id,
            type="invite_reward",
            amount=invite_reward,
            balance_after=inviter_locked.points_balance,
            reference_id=user.id,
            description=f"邀请新用户 {mask_phone(phone)}",
        ))

    await db.flush()
    brief = await _user_to_brief(db, user, raw_phone=phone)
    tokens = _build_token_pair(str(user.id))
    return AuthSuccessData(user=brief, tokens=tokens)


async def login(db: AsyncSession, phone: str, password: str) -> AuthSuccessData:
    phone_h = hash_phone(phone)
    user_q = await db.execute(select(User).where(User.phone_hash == phone_h))
    user = user_q.scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        raise InvalidCredentialsError()
    brief = await _user_to_brief(db, user, raw_phone=phone)
    tokens = _build_token_pair(str(user.id))
    return AuthSuccessData(user=brief, tokens=tokens)


def refresh_tokens(refresh_token: str) -> AuthTokenPair:
    payload = decode_refresh_token(refresh_token)
    user_id = payload.get("sub")
    if not user_id:
        from ziwei_app.core.exceptions import InvalidRefreshTokenError
        raise InvalidRefreshTokenError()
    return _build_token_pair(user_id)
