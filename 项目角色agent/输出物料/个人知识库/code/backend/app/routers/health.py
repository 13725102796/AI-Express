"""
健康检查路由 — GET /api/health
"""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    健康检查接口，验证数据库连接是否正常。
    返回应用状态和数据库连通性。
    """
    db_status = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    status = "healthy" if db_status == "ok" else "unhealthy"
    return {
        "status": status,
        "service": "KnowBase API",
        "version": "1.0.0",
        "database": db_status,
    }
