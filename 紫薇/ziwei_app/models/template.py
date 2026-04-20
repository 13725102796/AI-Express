"""PromptTemplate + UserTemplate 模型."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, UUIDMixin, _utcnow


class PromptTemplate(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "prompt_templates"

    name: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    detail: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_content: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    points_cost: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    preview_image_url: Mapped[str | None] = mapped_column(String(256))
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")
    unlock_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class UserTemplate(UUIDMixin, Base):
    __tablename__ = "user_templates"
    __table_args__ = (
        UniqueConstraint("user_id", "template_id", name="uniq_user_template"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("prompt_templates.id"), nullable=False
    )
    points_spent: Mapped[int] = mapped_column(Integer, nullable=False)
    unlocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
