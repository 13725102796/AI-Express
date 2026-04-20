"""认证模块 schemas — 与 shared-types.md §3.1 对齐."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ──────────────────────────────────────────────
# Request
# ──────────────────────────────────────────────

class RegisterReq(BaseModel):
    phone: str = Field(..., min_length=11, max_length=11, description="11 位手机号")
    password: str = Field(..., min_length=8, max_length=64)
    invite_code: Optional[str] = Field(None, min_length=8, max_length=8)

    @field_validator("phone")
    @classmethod
    def _check_phone(cls, v: str) -> str:
        if not (v.isdigit() and len(v) == 11 and v.startswith("1")):
            raise ValueError("手机号格式不正确")
        return v


class LoginReq(BaseModel):
    phone: str = Field(..., min_length=11, max_length=11)
    password: str = Field(..., min_length=8, max_length=64)


class RefreshReq(BaseModel):
    refresh_token: str


# ──────────────────────────────────────────────
# Response
# ──────────────────────────────────────────────

class UserBrief(BaseModel):
    id: str
    nickname: str
    avatar_url: Optional[str] = None
    phone_masked: str
    points_balance: int
    invite_code: str
    free_reading_used: bool
    has_profile: bool
    created_at: str


class AuthTokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int


class AuthSuccessData(BaseModel):
    user: UserBrief
    tokens: AuthTokenPair
