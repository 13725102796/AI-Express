"""FastAPI 依赖：当前用户 / 管理员 / DB session 等."""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.exceptions import (
    AdminUnauthorizedError, ForbiddenError, TokenExpiredError,
)
from ziwei_app.core.security import (
    ACCESS_TOKEN_TYPE, decode_admin_token, decode_user_token,
)
from ziwei_app.db.session import get_db
from ziwei_app.models.admin import Admin
from ziwei_app.models.user import User


def _extract_bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise TokenExpiredError(message="缺少 Authorization Bearer token")
    return authorization.split(" ", 1)[1].strip()


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    token = _extract_bearer(authorization)
    payload = decode_user_token(token)
    if payload.get("type") != ACCESS_TOKEN_TYPE:
        raise TokenExpiredError(message="Token 类型错误")
    user_id = payload.get("sub")
    if not user_id:
        raise TokenExpiredError(message="Token 无效")
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise ForbiddenError(message="用户不存在")
    return user


async def get_optional_user(
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not authorization:
        return None
    try:
        return await get_current_user(authorization, db)
    except Exception:
        return None


async def get_current_admin(
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> Admin:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AdminUnauthorizedError()
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_admin_token(token)
    admin_id = payload.get("sub")
    if not admin_id:
        raise AdminUnauthorizedError()
    result = await db.execute(select(Admin).where(Admin.id == uuid.UUID(admin_id)))
    admin = result.scalar_one_or_none()
    if not admin:
        raise AdminUnauthorizedError()
    return admin
