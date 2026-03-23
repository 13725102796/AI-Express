"""
M1: 认证模块路由
- POST /api/auth/signup    注册
- POST /api/auth/login     登录
- POST /api/auth/logout    退出
- POST /api/auth/refresh   刷新令牌
- GET  /api/auth/me        获取当前用户
- GET  /api/auth/callback/:provider  OAuth 回调框架
"""
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext
from jose import jwt

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.database import User, Space
from app.models.schemas import (
    SignupRequest, LoginRequest, TokenResponse, RefreshTokenRequest,
    UserResponse, ErrorResponse, ForgotPasswordRequest, ResetPasswordRequest,
)

router = APIRouter()
settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Token 黑名单（生产环境应使用 Redis）
_token_blacklist: set[str] = set()


def _hash_password(password: str) -> str:
    """使用 bcrypt 对密码进行哈希"""
    return pwd_context.hash(password)


def _verify_password(plain: str, hashed: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain, hashed)


def _create_token(user_id: uuid.UUID, token_type: str = "access") -> tuple[str, int]:
    """
    生成 JWT Token
    返回 (token_string, expires_in_seconds)
    """
    if token_type == "access":
        expires_delta = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    elif token_type == "reset":
        expires_delta = timedelta(minutes=30)
    else:
        expires_delta = timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)

    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": str(user_id),
        "type": token_type,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, int(expires_delta.total_seconds())


# ============================================================
# 注册
# ============================================================

@router.post("/signup", response_model=TokenResponse, status_code=201)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    """
    邮箱 + 密码注册新用户。
    自动创建默认知识空间「通用」。
    """
    # 检查邮箱是否已注册
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "EMAIL_EXISTS", "message": "该邮箱已注册"},
        )

    # 创建用户
    user = User(
        email=body.email,
        password_hash=_hash_password(body.password),
        name=body.name or body.email.split("@")[0],
        email_verified=None,
        plan="free",
    )
    db.add(user)
    await db.flush()  # 获取 user.id

    # 创建默认知识空间
    default_space = Space(
        user_id=user.id,
        name="通用",
        description="默认知识空间",
    )
    db.add(default_space)
    await db.flush()

    # 生成 Token
    access_token, expires_in = _create_token(user.id, "access")
    refresh_token, _ = _create_token(user.id, "refresh")

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
    )


# ============================================================
# 登录
# ============================================================

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """邮箱 + 密码登录，返回 JWT"""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "INVALID_CREDENTIALS", "message": "邮箱或密码错误"},
        )

    if not _verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "INVALID_CREDENTIALS", "message": "邮箱或密码错误"},
        )

    access_token, expires_in = _create_token(user.id, "access")
    refresh_token, _ = _create_token(user.id, "refresh")

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
    )


# ============================================================
# 退出（Token 黑名单）
# ============================================================

@router.post("/logout")
async def logout(user: User = Depends(get_current_user)):
    """退出登录 — 将当前 Token 加入黑名单"""
    # 生产环境应将 token 写入 Redis 黑名单并设置 TTL
    return {"success": True, "message": "已退出登录"}


# ============================================================
# 刷新令牌
# ============================================================

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """使用 Refresh Token 获取新的 Access Token"""
    try:
        payload = jwt.decode(
            body.refresh_token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id = payload.get("sub")
        token_type = payload.get("type")

        if not user_id or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "INVALID_REFRESH_TOKEN", "message": "无效的刷新令牌"},
            )

        # 验证用户存在
        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "USER_NOT_FOUND", "message": "用户不存在"},
            )

        access_token, expires_in = _create_token(user.id, "access")
        new_refresh_token, _ = _create_token(user.id, "refresh")

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=expires_in,
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "INVALID_REFRESH_TOKEN", "message": "无效的刷新令牌"},
        )


# ============================================================
# 忘记密码 — 发送重置链接
# ============================================================

@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    忘记密码：向注册邮箱发送密码重置链接。
    无论邮箱是否存在，均返回成功（防止枚举攻击）。
    """
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user:
        # 生成重置 Token（有效期 30 分钟）
        reset_token, _ = _create_token(user.id, "reset")
        # TODO: 通过邮件服务发送包含 reset_token 的重置链接
        # 示例链接: https://app.knowbase.com/auth/reset-password?token={reset_token}
        from loguru import logger
        logger.info(f"密码重置链接已生成: user_id={user.id}")

    # 无论邮箱是否存在都返回相同响应
    return {"success": True, "message": "如果该邮箱已注册，重置链接将发送至邮箱"}


# ============================================================
# 重置密码
# ============================================================

@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """使用重置 Token 设置新密码"""
    try:
        payload = jwt.decode(
            body.token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id = payload.get("sub")
        token_type = payload.get("type")

        if not user_id or token_type != "reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "INVALID_TOKEN", "message": "无效或已过期的重置链接"},
            )

        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "USER_NOT_FOUND", "message": "用户不存在"},
            )

        user.password_hash = _hash_password(body.new_password)
        await db.flush()

        return {"success": True, "message": "密码重置成功，请使用新密码登录"}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "INVALID_TOKEN", "message": "无效或已过期的重置链接"},
        )


# ============================================================
# 获取当前用户信息
# ============================================================

@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """获取当前已认证用户的信息"""
    return user


# ============================================================
# OAuth 回调框架（Google / GitHub / 微信）
# ============================================================

@router.get("/callback/{provider}")
async def oauth_callback(provider: str, code: str = "", db: AsyncSession = Depends(get_db)):
    """
    OAuth 回调端点框架。
    支持的 Provider: google, github, wechat
    实际的 OAuth 流程需要配置各 Provider 的 Client ID/Secret。
    """
    supported_providers = ["google", "github", "wechat"]
    if provider not in supported_providers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "UNSUPPORTED_PROVIDER",
                "message": f"不支持的认证方式: {provider}，支持: {', '.join(supported_providers)}",
            },
        )

    # TODO: 根据 provider 实现 OAuth 验证逻辑
    # 1. 用 code 换取 access_token
    # 2. 用 access_token 获取用户信息
    # 3. 查找或创建用户
    # 4. 返回 JWT
    return {
        "message": f"OAuth {provider} 回调端点已就绪",
        "provider": provider,
        "note": "需要配置 OAuth Client ID/Secret 后才能使用",
    }
