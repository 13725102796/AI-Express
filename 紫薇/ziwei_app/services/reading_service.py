"""AI 解读业务逻辑：前置校验 → prompt 渲染 → Gemini 流式 → 落库 / 失败退积分."""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import List, Optional, Tuple

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.config import settings
from ziwei_app.core.exceptions import (
    ChartDataMissingError,
    ReadingPointsInsufficientError,
    ReportNotFoundError,
    TemplateNotUnlockedError,
)
from ziwei_app.models.chart import ChartData
from ziwei_app.models.reading import ReadingReport
from ziwei_app.models.template import PromptTemplate
from ziwei_app.models.user import User, UserProfile
from ziwei_app.services import template_service
from ziwei_app.services.points_service import change_points, get_config_value
from ziwei_app.utils.prompt_renderer import (
    build_user_birth_summary,
    gender_to_chinese,
    render_prompt,
)


# ──────────────────────────────────────────────
# 数据结构
# ──────────────────────────────────────────────

@dataclass
class ReadingContext:
    user_id: uuid.UUID
    template: PromptTemplate
    chart: ChartData
    prompt: str
    report_id: uuid.UUID
    is_free_use: bool
    points_spent: int
    balance_after: int       # 扣费后余额（首免则未扣，保持原值）


# ──────────────────────────────────────────────
# 前置：解读准备（校验 + 扣费 + 预分配 report_id）
# ──────────────────────────────────────────────

async def prepare_reading(
    db: AsyncSession, user: User, template_id: uuid.UUID
) -> ReadingContext:
    """
    1) 校验模板存在 + 已解锁（或免费模板默认视为解锁需具体判断）
    2) 校验排盘数据已就位
    3) 首免判断：user.free_reading_used == False → 跳过扣费且标记 True
    4) 否则扣 reading_cost（默认 10）
    5) 渲染 prompt
    6) 返回 ReadingContext（含预分配 report_id，用于 SSE meta 事件）
    """
    # 1) 模板
    tpl = await template_service.get_template(db, template_id)
    # 免费模板（points_cost=0）视为天然"已解锁"；付费模板需已解锁
    if tpl.points_cost > 0:
        if not await template_service.is_unlocked(db, user.id, template_id):
            raise TemplateNotUnlockedError()

    # 2) 排盘数据
    chart = (
        await db.execute(select(ChartData).where(ChartData.user_id == user.id))
    ).scalar_one_or_none()
    if not chart:
        raise ChartDataMissingError()

    # 3) 首免判断（必要时行锁更新 user）
    cost = await get_config_value(db, "reading_cost", 10)
    user_locked = (
        await db.execute(select(User).where(User.id == user.id).with_for_update())
    ).scalar_one()

    is_free_use = not user_locked.free_reading_used
    if is_free_use:
        user_locked.free_reading_used = True
        points_spent = 0
        balance_after = user_locked.points_balance
    else:
        if user_locked.points_balance < cost:
            raise ReadingPointsInsufficientError()
        balance_after, _ = await change_points(
            db, user.id, -cost, "ai_reading",
            reference_id=template_id,
            description=f"AI 解读：{tpl.name}",
        )
        points_spent = cost

    # 4) 渲染 prompt（profile 关联 chart → 读档案）
    profile = (
        await db.execute(select(UserProfile).where(UserProfile.user_id == user.id))
    ).scalar_one_or_none()
    if not profile:
        # 极端边界：排盘存在但档案不存在（外部手动破坏数据）。降级使用简化上下文
        prompt_ctx = {
            "排盘数据": chart.chart_text,
            "用户性别": "缘主",
            "用户出生信息": "",
        }
    else:
        prompt_ctx = {
            "排盘数据": chart.chart_text,
            "用户性别": gender_to_chinese(profile.gender),
            "用户出生信息": build_user_birth_summary(profile),
        }
    prompt = render_prompt(tpl.prompt_content, prompt_ctx)

    await db.flush()
    return ReadingContext(
        user_id=user.id,
        template=tpl,
        chart=chart,
        prompt=prompt,
        report_id=uuid.uuid4(),
        is_free_use=is_free_use,
        points_spent=points_spent,
        balance_after=balance_after,
    )


# ──────────────────────────────────────────────
# 成功：落库
# ──────────────────────────────────────────────

async def create_pending_report(
    db: AsyncSession, ctx: ReadingContext
) -> ReadingReport:
    """
    在 SSE 开始前预创建空报告行（ai_response='' 占位）。
    这样即使后续客户端断流，已有的 report_id 仍可被 update_report_chunk 增量填充，
    用户在「我的报告」里能找回部分内容。
    """
    report = ReadingReport(
        id=ctx.report_id,
        user_id=ctx.user_id,
        template_id=ctx.template.id,
        chart_id=ctx.chart.id,
        prompt_snapshot=ctx.prompt,
        ai_response="",
        model_name=settings.GEMINI_MODEL,
        token_usage=None,
        points_spent=ctx.points_spent,
        share_token=None,
    )
    db.add(report)
    await db.flush()
    return report


async def update_report_text(
    db: AsyncSession,
    ctx: ReadingContext,
    ai_response: str,
    *,
    token_usage: Optional[dict] = None,
    finished: bool = False,
) -> None:
    """
    增量保存：流式过程中每 N 字调一次，最终 done 时 finished=True。
    使用 UPDATE 覆盖现有 report.ai_response（断流时数据库就有最新累积内容）。
    """
    from sqlalchemy import update

    stmt = (
        update(ReadingReport)
        .where(ReadingReport.id == ctx.report_id)
        .values(ai_response=ai_response, token_usage=token_usage)
    )
    await db.execute(stmt)
    # 增量写入立即提交，确保客户端断流时数据已落地
    await db.commit()


# 向后兼容旧 API（test_reading_service.py 可能仍引用）
async def save_report(
    db: AsyncSession,
    ctx: ReadingContext,
    ai_response: str,
    *,
    token_usage: Optional[dict] = None,
    model_name: Optional[str] = None,
) -> ReadingReport:
    report = ReadingReport(
        id=ctx.report_id,
        user_id=ctx.user_id,
        template_id=ctx.template.id,
        chart_id=ctx.chart.id,
        prompt_snapshot=ctx.prompt,
        ai_response=ai_response,
        model_name=model_name or settings.GEMINI_MODEL,
        token_usage=token_usage,
        points_spent=ctx.points_spent,
        share_token=None,
    )
    db.add(report)
    await db.flush()
    return report


# ──────────────────────────────────────────────
# 失败：退积分 + 回滚首免标记
# ──────────────────────────────────────────────

async def refund(
    db: AsyncSession, ctx: ReadingContext
) -> int:
    """
    调用失败退积分：
      - 若 is_free_use=True：恢复 free_reading_used=False（让用户能再用免费名额）
      - 若已扣费：加回 points_spent 并写 refund 流水
    返回最终 balance_after。
    """
    user = (
        await db.execute(select(User).where(User.id == ctx.user_id).with_for_update())
    ).scalar_one()

    if ctx.is_free_use:
        user.free_reading_used = False
        await db.flush()
        return user.points_balance

    if ctx.points_spent <= 0:
        return user.points_balance

    balance, _ = await change_points(
        db, ctx.user_id, ctx.points_spent, "refund",
        reference_id=ctx.template.id,
        description=f"AI 解读失败退款：{ctx.template.name}",
    )
    return balance


# ──────────────────────────────────────────────
# 查询：列表 + 详情
# ──────────────────────────────────────────────

async def list_reports(
    db: AsyncSession, user_id: uuid.UUID, page: int = 1, page_size: int = 20
) -> Tuple[List[Tuple[ReadingReport, str]], int]:
    """返回 (rows, total)，rows 每行 (report, template_name)."""
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    total = int(
        (
            await db.execute(
                select(func.count())
                .select_from(ReadingReport)
                .where(ReadingReport.user_id == user_id)
            )
        ).scalar_one() or 0
    )
    rows = (
        await db.execute(
            select(ReadingReport, PromptTemplate.name)
            .join(PromptTemplate, PromptTemplate.id == ReadingReport.template_id)
            .where(ReadingReport.user_id == user_id)
            .order_by(ReadingReport.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return [(r[0], r[1]) for r in rows], total


async def get_report(
    db: AsyncSession, user_id: uuid.UUID, report_id: uuid.UUID
) -> ReadingReport:
    r = (
        await db.execute(
            select(ReadingReport).where(
                and_(ReadingReport.id == report_id, ReadingReport.user_id == user_id)
            )
        )
    ).scalar_one_or_none()
    if not r:
        raise ReportNotFoundError()
    return r


def excerpt(text: str, limit: int = 100) -> str:
    if not text:
        return ""
    return text[:limit] + ("…" if len(text) > limit else "")
