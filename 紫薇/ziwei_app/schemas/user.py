"""用户模块 schemas — 与 shared-types.md §3.2 对齐."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ──────────────────────────────────────────────
# Response
# ──────────────────────────────────────────────

class UserProfileOut(BaseModel):
    id: str
    user_id: str
    birth_type: str            # solar / lunar
    birth_year: int
    birth_month: int
    birth_day: int
    birth_time_index: int
    gender: str                # male / female
    is_leap_month: bool
    birth_place_province: Optional[str] = None
    birth_place_city: Optional[str] = None
    created_at: str
    updated_at: str


# ──────────────────────────────────────────────
# Request
# ──────────────────────────────────────────────

class UpsertProfileReq(BaseModel):
    birth_type: str = Field(..., description="solar / lunar")
    birth_year: int = Field(..., ge=1900)
    birth_month: int = Field(..., ge=1, le=12)
    birth_day: int = Field(..., ge=1, le=31)
    birth_time_index: int = Field(..., ge=0, le=12)
    gender: str = Field(..., description="male / female")
    is_leap_month: bool = False
    birth_place_province: Optional[str] = Field(None, max_length=32)
    birth_place_city: Optional[str] = Field(None, max_length=32)

    @field_validator("birth_type")
    @classmethod
    def _check_birth_type(cls, v: str) -> str:
        if v not in ("solar", "lunar"):
            raise ValueError("birth_type 必须为 solar 或 lunar")
        return v

    @field_validator("gender")
    @classmethod
    def _check_gender(cls, v: str) -> str:
        if v not in ("male", "female"):
            raise ValueError("gender 必须为 male 或 female")
        return v

    @field_validator("birth_year")
    @classmethod
    def _check_year(cls, v: int) -> int:
        current_year = datetime.now().year
        if v > current_year:
            raise ValueError(f"birth_year 不能大于当前年份 {current_year}")
        return v


class UpsertProfileRespData(BaseModel):
    profile: UserProfileOut
    chart_generated: bool
