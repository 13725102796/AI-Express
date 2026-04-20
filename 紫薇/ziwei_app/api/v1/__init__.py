"""聚合 v1 子路由."""
from __future__ import annotations

from fastapi import APIRouter

from .admin import admin_router
from .auth import router as auth_router
from .chart import router as chart_router
from .points import router as points_router
from .reading import router as reading_router
from .share import owner_router as share_owner_router
from .share import public_router as share_public_router
from .templates import public_router as templates_router
from .templates import user_tpl_router
from .user import router as user_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(user_router, prefix="/user", tags=["user"])
api_router.include_router(chart_router, prefix="/chart", tags=["chart"])
api_router.include_router(points_router, prefix="/points", tags=["points"])
api_router.include_router(templates_router, prefix="/templates", tags=["templates"])
api_router.include_router(user_tpl_router, prefix="/user/templates", tags=["templates"])
api_router.include_router(reading_router, prefix="/reading", tags=["reading"])
# 分享：owner 挂在 /reading（与 POST /reading/reports/{id}/share 对齐）
api_router.include_router(share_owner_router, prefix="/reading", tags=["share"])
# 公开 /share/{token}
api_router.include_router(share_public_router, prefix="/share", tags=["share"])
# 管理后台
api_router.include_router(admin_router, prefix="/admin")
