"""分享 API 路由：
- POST /api/v1/reading/reports/{id}/share （登录：生成 token）
- GET  /api/v1/share/{token}              （公开）
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.deps import get_current_user
from ziwei_app.core.exceptions import ReportNotFoundError, ShareTokenInvalidError
from ziwei_app.db.session import get_db
from ziwei_app.models.user import User
from ziwei_app.schemas.common import ApiResponse, ok
from ziwei_app.schemas.share import AIGC_WATERMARK, CreateShareRespData, PublicShareData
from ziwei_app.services import share_service
from ziwei_app.utils.time import to_iso

# 登录路由（挂在 /reading/reports/{id}/share）
owner_router = APIRouter()
# 公开路由（挂在 /share/{token}）
public_router = APIRouter()


@owner_router.post(
    "/reports/{report_id}/share",
    response_model=ApiResponse[CreateShareRespData],
)
async def create_share(
    report_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[CreateShareRespData]:
    try:
        rid = uuid.UUID(report_id)
    except ValueError:
        raise ReportNotFoundError()
    report, share_url = await share_service.create_share(db, user.id, rid)
    return ok(
        CreateShareRespData(
            share_token=report.share_token or "",
            share_url=share_url,
            watermark_text=AIGC_WATERMARK,
        ),
        "分享链接已生成",
    )


@public_router.get("/{token}", response_model=ApiResponse[PublicShareData])
async def view_share(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[PublicShareData]:
    if not token:
        raise ShareTokenInvalidError()
    report, tpl = await share_service.get_public_share(db, token)
    return ok(
        PublicShareData(
            template_name=tpl.name,
            excerpt=share_service.excerpt(report.ai_response, 500),
            created_at=to_iso(report.created_at) or "",
            watermark_text=AIGC_WATERMARK,
            cta_text="进入紫微灵犀获取完整解读",
        )
    )
