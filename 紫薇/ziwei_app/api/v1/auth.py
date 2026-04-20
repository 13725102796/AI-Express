"""认证 API 路由."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.db.session import get_db
from ziwei_app.schemas.auth import AuthSuccessData, AuthTokenPair, LoginReq, RefreshReq, RegisterReq
from ziwei_app.schemas.common import ApiResponse, ok
from ziwei_app.services import auth_service

router = APIRouter()


@router.post("/register", response_model=ApiResponse[AuthSuccessData])
async def register(body: RegisterReq, db: AsyncSession = Depends(get_db)) -> ApiResponse[AuthSuccessData]:
    data = await auth_service.register(db, body.phone, body.password, body.invite_code)
    return ok(data, "注册成功")


@router.post("/login", response_model=ApiResponse[AuthSuccessData])
async def login(body: LoginReq, db: AsyncSession = Depends(get_db)) -> ApiResponse[AuthSuccessData]:
    data = await auth_service.login(db, body.phone, body.password)
    return ok(data, "登录成功")


@router.post("/token/refresh", response_model=ApiResponse[AuthTokenPair])
async def refresh(body: RefreshReq) -> ApiResponse[AuthTokenPair]:
    tokens = auth_service.refresh_tokens(body.refresh_token)
    return ok(tokens, "刷新成功")
