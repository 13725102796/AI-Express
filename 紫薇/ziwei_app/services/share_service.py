"""分享业务逻辑：生成 share_token / 公开查 token → 报告摘要."""
from __future__ import annotations

import uuid
from typing import Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.config import settings
from ziwei_app.core.exceptions import ReportNotFoundError, ShareTokenInvalidError
from ziwei_app.core.security import generate_share_token
from ziwei_app.models.reading import ReadingReport
from ziwei_app.models.template import PromptTemplate


async def create_share(
    db: AsyncSession, user_id: uuid.UUID, report_id: uuid.UUID
) -> Tuple[ReadingReport, str]:
    """
    为报告生成 share_token（若已存在则直接复用）。
    返回 (report, share_url)。
    """
    report = (
        await db.execute(
            select(ReadingReport).where(
                ReadingReport.id == report_id,
                ReadingReport.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if not report:
        raise ReportNotFoundError()

    if not report.share_token:
        # 冲突重试：24 位 urlsafe，理论极低冲突
        for _ in range(5):
            tok = generate_share_token()
            dup = (
                await db.execute(
                    select(ReadingReport.id).where(ReadingReport.share_token == tok)
                )
            ).scalar_one_or_none()
            if not dup:
                report.share_token = tok
                break
        else:
            raise RuntimeError("share_token 生成 5 次冲突，请重试")
        await db.flush()

    share_url = _build_share_url(report.share_token)
    return report, share_url


def _build_share_url(token: str) -> str:
    base = settings.SHARE_BASE_URL.rstrip("/")
    return f"{base}/share/{token}"


async def get_public_share(
    db: AsyncSession, token: str, excerpt_limit: int = 500
) -> Tuple[ReadingReport, PromptTemplate]:
    """根据 share_token 查报告 + 模板信息（公开端点，不做用户校验）."""
    if not token or len(token) < 8:
        raise ShareTokenInvalidError()
    row = (
        await db.execute(
            select(ReadingReport, PromptTemplate)
            .join(PromptTemplate, PromptTemplate.id == ReadingReport.template_id)
            .where(ReadingReport.share_token == token)
        )
    ).first()
    if not row:
        raise ShareTokenInvalidError()
    return row[0], row[1]


def excerpt(text: str, limit: int = 500) -> str:
    if not text:
        return ""
    return text[:limit] + ("…" if len(text) > limit else "")
