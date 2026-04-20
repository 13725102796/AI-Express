"""pytest 共享 fixture."""
from __future__ import annotations

import asyncio
import os

import pytest
import pytest_asyncio

# 强制使用测试库（覆盖 .env）
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://ziwei:ziwei@localhost:5432/ziwei_test")
os.environ.setdefault("APP_DEBUG", "false")


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def setup_db():
    """初始化测试库 schema（建议测试前手动跑 alembic upgrade head）."""
    yield
