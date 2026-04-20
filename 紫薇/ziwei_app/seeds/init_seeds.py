"""一次性种子脚本：积分配置 + 模板 + 默认管理员."""
from __future__ import annotations

import asyncio

from sqlalchemy import select

from ziwei_app.core.config import settings
from ziwei_app.core.security import hash_password
from ziwei_app.db.base import AsyncSessionLocal
from ziwei_app.models.admin import Admin
from ziwei_app.models.points import PointsConfig
from ziwei_app.models.template import PromptTemplate

from .points_config import DEFAULT_POINTS_CONFIG
from .templates import DEFAULT_TEMPLATES


async def seed_points_config(db) -> int:
    inserted = 0
    for key, value, desc in DEFAULT_POINTS_CONFIG:
        exists = await db.execute(select(PointsConfig).where(PointsConfig.key == key))
        if exists.scalar_one_or_none():
            continue
        db.add(PointsConfig(key=key, value=value, description=desc))
        inserted += 1
    await db.commit()
    return inserted


async def seed_templates(db) -> int:
    inserted = 0
    for tpl in DEFAULT_TEMPLATES:
        exists = await db.execute(select(PromptTemplate).where(PromptTemplate.name == tpl["name"]))
        if exists.scalar_one_or_none():
            continue
        db.add(PromptTemplate(**tpl))
        inserted += 1
    await db.commit()
    return inserted


async def seed_admin(db) -> bool:
    exists = await db.execute(
        select(Admin).where(Admin.username == settings.INITIAL_ADMIN_USERNAME)
    )
    if exists.scalar_one_or_none():
        return False
    db.add(Admin(
        username=settings.INITIAL_ADMIN_USERNAME,
        password_hash=hash_password(settings.INITIAL_ADMIN_PASSWORD),
    ))
    await db.commit()
    return True


async def main() -> None:
    async with AsyncSessionLocal() as db:
        n_cfg = await seed_points_config(db)
        n_tpl = await seed_templates(db)
        n_admin = await seed_admin(db)
        print(f"[seeds] points_config inserted: {n_cfg}")
        print(f"[seeds] templates inserted: {n_tpl}")
        print(f"[seeds] admin created: {n_admin}")


if __name__ == "__main__":
    asyncio.run(main())
