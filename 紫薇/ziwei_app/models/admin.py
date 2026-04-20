"""Admin 模型."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, UUIDMixin, _utcnow


class Admin(UUIDMixin, Base):
    __tablename__ = "admins"

    username: Mapped[str] = mapped_column(String(32), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
