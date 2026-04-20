"""User + UserProfile 模型."""
from __future__ import annotations

import uuid

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDMixin


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("points_balance >= 0", name="chk_points_balance_non_negative"),
    )

    phone_encrypted: Mapped[str] = mapped_column(String(256), nullable=False)
    phone_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    nickname: Mapped[str | None] = mapped_column(String(32))
    avatar_url: Mapped[str | None] = mapped_column(String(256))
    points_balance: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    invite_code: Mapped[str] = mapped_column(String(8), nullable=False, unique=True, index=True)
    invited_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), index=True
    )
    free_reading_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class UserProfile(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    birth_type: Mapped[str] = mapped_column(String(8), nullable=False)  # solar / lunar
    birth_year: Mapped[int] = mapped_column(Integer, nullable=False)
    birth_month: Mapped[int] = mapped_column(Integer, nullable=False)
    birth_day: Mapped[int] = mapped_column(Integer, nullable=False)
    birth_time_index: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(8), nullable=False)  # male / female
    is_leap_month: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    birth_place_province: Mapped[str | None] = mapped_column(String(32))
    birth_place_city: Mapped[str | None] = mapped_column(String(32))
