"""PointsTransaction + CheckinRecord + PointsConfig 模型."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Date, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, UUIDMixin, _utcnow


class PointsTransaction(UUIDMixin, Base):
    __tablename__ = "points_transactions"
    __table_args__ = (
        Index("idx_points_tx_user_created", "user_id", "created_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True))
    description: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )


class CheckinRecord(UUIDMixin, Base):
    __tablename__ = "checkin_records"
    __table_args__ = (
        UniqueConstraint("user_id", "checkin_date", name="uniq_checkin_user_date"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    checkin_date: Mapped[date] = mapped_column(Date, nullable=False)
    consecutive_days: Mapped[int] = mapped_column(Integer, nullable=False)
    points_earned: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )


class PointsConfig(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "points_configs"

    key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    value: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(String(200))
