"""异步引擎 + sessionmaker."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from ziwei_app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.APP_DEBUG,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)
