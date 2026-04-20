"""安全工具：JWT / bcrypt / AES-256-GCM 手机号加密 / SHA-256 hash."""
from __future__ import annotations

import base64
import hashlib
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from passlib.context import CryptContext

from .config import settings
from .exceptions import (
    AdminUnauthorizedError,
    InvalidRefreshTokenError,
    TokenExpiredError,
)

# ──────────────────────────────────────────────
# 密码哈希
# ──────────────────────────────────────────────

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)


# ──────────────────────────────────────────────
# JWT
# ──────────────────────────────────────────────

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"
ADMIN_TOKEN_TYPE = "admin"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(subject: str) -> tuple[str, int]:
    """返回 (token, expires_in_seconds)."""
    expire = _now() + timedelta(days=settings.JWT_ACCESS_EXPIRE_DAYS)
    payload = {"sub": subject, "type": ACCESS_TOKEN_TYPE, "iat": _now(), "exp": expire}
    token = jwt.encode(payload, settings.JWT_SECRET_USER, algorithm=settings.JWT_ALGORITHM)
    return token, int((expire - _now()).total_seconds())


def create_refresh_token(subject: str) -> str:
    expire = _now() + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    payload = {
        "sub": subject, "type": REFRESH_TOKEN_TYPE,
        "iat": _now(), "exp": expire, "jti": secrets.token_hex(8),
    }
    return jwt.encode(payload, settings.JWT_SECRET_USER, algorithm=settings.JWT_ALGORITHM)


def create_admin_token(subject: str) -> tuple[str, int]:
    expire = _now() + timedelta(hours=settings.JWT_ADMIN_EXPIRE_HOURS)
    payload = {"sub": subject, "type": ADMIN_TOKEN_TYPE, "iat": _now(), "exp": expire}
    token = jwt.encode(payload, settings.JWT_SECRET_ADMIN, algorithm=settings.JWT_ALGORITHM)
    return token, int((expire - _now()).total_seconds())


def decode_user_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.JWT_SECRET_USER, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise TokenExpiredError()
    except jwt.PyJWTError as e:
        raise TokenExpiredError(message=f"Token 无效：{e}")


def decode_refresh_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_USER, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise InvalidRefreshTokenError()
    if payload.get("type") != REFRESH_TOKEN_TYPE:
        raise InvalidRefreshTokenError()
    return payload


def decode_admin_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_ADMIN, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise AdminUnauthorizedError(message="管理员登录已过期")
    except jwt.PyJWTError:
        raise AdminUnauthorizedError()
    if payload.get("type") != ADMIN_TOKEN_TYPE:
        raise AdminUnauthorizedError()
    return payload


# ──────────────────────────────────────────────
# AES-256-GCM 手机号加密
# ──────────────────────────────────────────────

def _key_bytes() -> bytes:
    raw = base64.b64decode(settings.PHONE_ENC_KEY)
    if len(raw) != 32:
        raise ValueError("PHONE_ENC_KEY 必须是 base64 编码的 32 字节")
    return raw


def encrypt_phone(phone: str) -> str:
    """AES-256-GCM 加密 → base64(nonce || ciphertext_with_tag)."""
    aesgcm = AESGCM(_key_bytes())
    nonce = secrets.token_bytes(12)
    ct = aesgcm.encrypt(nonce, phone.encode("utf-8"), None)
    return base64.b64encode(nonce + ct).decode("ascii")


def decrypt_phone(encrypted: str) -> str:
    raw = base64.b64decode(encrypted)
    nonce, ct = raw[:12], raw[12:]
    aesgcm = AESGCM(_key_bytes())
    return aesgcm.decrypt(nonce, ct, None).decode("utf-8")


def hash_phone(phone: str) -> str:
    """SHA-256(phone) hex —— 用于 UNIQUE 索引和登录查询."""
    return hashlib.sha256(phone.encode("utf-8")).hexdigest()


def mask_phone(phone: str) -> str:
    if len(phone) != 11:
        return phone
    return f"{phone[:3]}****{phone[-4:]}"


# ──────────────────────────────────────────────
# 邀请码
# ──────────────────────────────────────────────

_INVITE_ALPHABET = string.ascii_uppercase + string.digits  # 36
_INVITE_LEN = 8


def generate_invite_code() -> str:
    return "".join(secrets.choice(_INVITE_ALPHABET) for _ in range(_INVITE_LEN))


# ──────────────────────────────────────────────
# 分享 token
# ──────────────────────────────────────────────

def generate_share_token() -> str:
    return secrets.token_urlsafe(24)[:32]
