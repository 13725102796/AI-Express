"""安全工具单元测试（不依赖数据库）."""
from __future__ import annotations

import pytest

from ziwei_app.core.security import (
    create_access_token,
    create_admin_token,
    create_refresh_token,
    decode_admin_token,
    decode_refresh_token,
    decode_user_token,
    decrypt_phone,
    encrypt_phone,
    generate_invite_code,
    generate_share_token,
    hash_password,
    hash_phone,
    mask_phone,
    verify_password,
)
from ziwei_app.core.exceptions import (
    AdminUnauthorizedError, InvalidRefreshTokenError, TokenExpiredError,
)


# ──────────────────────────────────────────────
# 密码
# ──────────────────────────────────────────────

def test_password_hash_and_verify():
    plain = "secret-password-123"
    hashed = hash_password(plain)
    assert hashed != plain
    assert verify_password(plain, hashed)
    assert not verify_password("wrong-password", hashed)


# ──────────────────────────────────────────────
# JWT
# ──────────────────────────────────────────────

def test_access_token_roundtrip():
    token, expires_in = create_access_token("user-123")
    assert expires_in > 0
    payload = decode_user_token(token)
    assert payload["sub"] == "user-123"
    assert payload["type"] == "access"


def test_refresh_token_roundtrip():
    token = create_refresh_token("user-456")
    payload = decode_refresh_token(token)
    assert payload["sub"] == "user-456"
    assert payload["type"] == "refresh"


def test_refresh_token_rejects_access_token():
    """access token 不能当 refresh token 用."""
    access_token, _ = create_access_token("user-789")
    with pytest.raises(InvalidRefreshTokenError):
        decode_refresh_token(access_token)


def test_admin_token_roundtrip():
    token, _ = create_admin_token("admin-1")
    payload = decode_admin_token(token)
    assert payload["sub"] == "admin-1"
    assert payload["type"] == "admin"


def test_admin_token_rejects_user_token():
    user_token, _ = create_access_token("user-1")
    with pytest.raises(AdminUnauthorizedError):
        decode_admin_token(user_token)


def test_invalid_token_raises():
    with pytest.raises(TokenExpiredError):
        decode_user_token("not-a-valid-token")


# ──────────────────────────────────────────────
# AES 手机号加解密
# ──────────────────────────────────────────────

def test_encrypt_phone_roundtrip():
    phone = "13812345678"
    encrypted = encrypt_phone(phone)
    assert encrypted != phone
    assert decrypt_phone(encrypted) == phone


def test_encrypt_phone_different_each_time():
    """nonce 随机化，相同明文加密两次结果不同."""
    p = "13800000000"
    assert encrypt_phone(p) != encrypt_phone(p)


def test_hash_phone_deterministic():
    """相同明文哈希结果固定（用于唯一索引）."""
    p = "13900000000"
    assert hash_phone(p) == hash_phone(p)
    assert hash_phone(p) != hash_phone("13900000001")


def test_mask_phone():
    assert mask_phone("13812345678") == "138****5678"
    assert mask_phone("12345") == "12345"  # 非 11 位返回原值


# ──────────────────────────────────────────────
# 邀请码 / 分享 token
# ──────────────────────────────────────────────

def test_invite_code_format():
    code = generate_invite_code()
    assert len(code) == 8
    assert code.isalnum()
    assert code.isupper() or any(c.isdigit() for c in code)


def test_share_token_format():
    t = generate_share_token()
    assert len(t) == 32
