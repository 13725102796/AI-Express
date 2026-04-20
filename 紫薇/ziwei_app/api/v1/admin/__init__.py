"""admin 子路由聚合 → /api/v1/admin/*"""
from __future__ import annotations

from fastapi import APIRouter

from .auth import router as admin_auth_router
from .points_config import router as admin_points_config_router
from .stats import router as admin_stats_router
from .templates import router as admin_templates_router
from .users import router as admin_users_router

admin_router = APIRouter()

admin_router.include_router(admin_auth_router, prefix="/auth", tags=["admin-auth"])
admin_router.include_router(admin_templates_router, prefix="/templates", tags=["admin-templates"])
admin_router.include_router(admin_users_router, prefix="/users", tags=["admin-users"])
admin_router.include_router(admin_points_config_router, prefix="/points-config", tags=["admin-points"])
admin_router.include_router(admin_stats_router, prefix="/stats", tags=["admin-stats"])
