"""ReadingReport 模型."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, UUIDMixin, _utcnow


class ReadingReport(UUIDMixin, Base):
    __tablename__ = "reading_reports"
    __table_args__ = (
        Index("idx_reports_user_created", "user_id", "created_at"),
        Index("uniq_share_token", "share_token", unique=True),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("prompt_templates.id"), nullable=False
    )
    chart_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("chart_data.id"), nullable=False
    )
    prompt_snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    ai_response: Mapped[str] = mapped_column(Text, nullable=False)
    model_name: Mapped[str] = mapped_column(String(64), nullable=False)
    token_usage: Mapped[dict | None] = mapped_column(JSON)
    points_spent: Mapped[int] = mapped_column(Integer, nullable=False)
    share_token: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
