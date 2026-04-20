"""ChartData 模型."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, UUIDMixin, _utcnow


class ChartData(UUIDMixin, Base):
    __tablename__ = "chart_data"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("user_profiles.id"), nullable=False
    )
    chart_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    chart_text: Mapped[str] = mapped_column(Text, nullable=False)
    api_params: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
