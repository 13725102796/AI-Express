"""管理后台 schemas — 与 shared-types.md §3.8 对齐."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from ziwei_app.schemas.auth import AuthTokenPair
from ziwei_app.schemas.template import PromptTemplateOut


# ──────────────────────────────────────────────
# Auth
# ──────────────────────────────────────────────

class AdminLoginReq(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    password: str = Field(..., min_length=6, max_length=64)


class AdminBrief(BaseModel):
    id: str
    username: str
    created_at: str


class AdminLoginRespData(BaseModel):
    admin: AdminBrief
    tokens: AuthTokenPair


# ──────────────────────────────────────────────
# Templates
# ──────────────────────────────────────────────

class AdminCreateTemplateReq(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    description: str = Field(..., min_length=1, max_length=200)
    detail: str = Field(..., min_length=1)
    prompt_content: str = Field(..., min_length=1)
    tags: List[str] = Field(default_factory=list)
    points_cost: int = Field(..., ge=0)
    preview_image_url: Optional[str] = None
    sort_order: int = 0


class AdminUpdateTemplateReq(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=64)
    description: Optional[str] = Field(None, min_length=1, max_length=200)
    detail: Optional[str] = None
    prompt_content: Optional[str] = None
    tags: Optional[List[str]] = None
    points_cost: Optional[int] = Field(None, ge=0)
    preview_image_url: Optional[str] = None
    sort_order: Optional[int] = None


class AdminToggleStatusReq(BaseModel):
    status: str = Field(..., description="active / inactive")


# ──────────────────────────────────────────────
# Users
# ──────────────────────────────────────────────

class AdminUserView(BaseModel):
    id: str
    nickname: str
    phone_masked: str
    points_balance: int
    invite_code: str
    invited_by: Optional[str] = None
    free_reading_used: bool
    has_profile: bool
    reports_count: int
    unlocks_count: int
    created_at: str


# ──────────────────────────────────────────────
# Points config
# ──────────────────────────────────────────────

class PointsConfigItemOut(BaseModel):
    id: str
    key: str
    value: int
    description: Optional[str] = None
    updated_at: str


class AdminUpdateConfigReq(BaseModel):
    value: int = Field(..., ge=0)


# ──────────────────────────────────────────────
# Stats
# ──────────────────────────────────────────────

class AdminStatsTop5(BaseModel):
    id: str
    name: str
    unlock_count: int


class AdminStatsOut(BaseModel):
    total_users: int
    total_charts: int
    total_reports: int
    total_unlocks: int
    dau_today: int
    dau_7d: List[int]
    top5_templates: List[AdminStatsTop5]
