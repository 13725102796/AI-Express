"""AI 解读 API 路由：SSE 流式 + 报告列表 / 详情."""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Any, AsyncIterator

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ziwei_app.core.deps import get_current_user
from ziwei_app.core.exceptions import ReportNotFoundError
from ziwei_app.db.session import get_db
from ziwei_app.models.user import User
from ziwei_app.schemas.common import ApiResponse, Paginated, ok
from ziwei_app.schemas.reading import (
    PaginatedReports,
    ReadingReportBriefOut,
    ReadingReportOut,
    StartReadingReq,
)
from ziwei_app.services import gemini_client, reading_service
from ziwei_app.utils.time import to_iso

logger = logging.getLogger(__name__)

router = APIRouter()


def _sse_event(event: str, data: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/start")
async def start_reading(
    body: StartReadingReq,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    开启 AI 解读（SSE）。

    前置失败（未解锁 / 积分不足 / 无排盘）→ 按 BizError 返回 JSON（http_status 非 200）
    进入流式后任何异常 → 退积分 + event: error
    """
    tid = uuid.UUID(body.template_id)
    ctx = await reading_service.prepare_reading(db, user, tid)
    # 立即预创建 report 行（空 ai_response），为客户端断流时也能保留已生成内容做准备
    await reading_service.create_pending_report(db, ctx)
    # 提交事务：扣费 + 首免标记 + 空报告行 一起持久化，让后续 stream 即使断也能从 DB 找回
    await db.commit()

    SAVE_EVERY_CHARS = 60  # 每累积 ~60 字 UPDATE 一次报告，断流时损失最多 60 字

    async def event_stream() -> AsyncIterator[str]:
        full_parts: list[str] = []
        last_saved_len = 0
        cancelled = False
        try:
            # 发 meta
            yield _sse_event("meta", {
                "report_id": str(ctx.report_id),
                "model": "灵犀神谕",
                "is_free_use": ctx.is_free_use,
                "points_spent": ctx.points_spent,
                "balance_after": ctx.balance_after,
            })

            client = gemini_client.get_client()
            async for chunk in client.stream_generate(ctx.prompt):
                text = getattr(chunk, "text", None) or ""
                if not text:
                    continue
                full_parts.append(text)
                yield _sse_event("chunk", {"text": text})

                # 增量落库：累积超 SAVE_EVERY_CHARS 字就 UPDATE 一次
                acc = "".join(full_parts)
                if len(acc) - last_saved_len >= SAVE_EVERY_CHARS:
                    try:
                        await reading_service.update_report_text(db, ctx, acc)
                        last_saved_len = len(acc)
                    except Exception:
                        logger.exception("增量保存失败（不阻塞流）")

            ai_response = "".join(full_parts)
            if not ai_response.strip():
                raise RuntimeError("AI 返回空响应")

            # 最终落库（finished=True）
            await reading_service.update_report_text(db, ctx, ai_response, finished=True)
            yield _sse_event("done", {
                "report_id": str(ctx.report_id),
                "total_chars": len(ai_response),
            })
        except asyncio.CancelledError:
            # 客户端断开（关闭页面/网络中断）
            cancelled = True
            acc = "".join(full_parts)
            logger.warning("SSE 客户端断开，已累积 %d 字，尝试落库", len(acc))
            if acc and len(acc) > last_saved_len:
                try:
                    await reading_service.update_report_text(db, ctx, acc)
                except Exception:
                    logger.exception("断流时增量保存失败")
            raise  # CancelledError 必须重抛
        except Exception as exc:
            logger.exception("AI 解读流式失败：%s", exc)
            # 已生成内容尽量先保存（不浪费）
            acc = "".join(full_parts)
            if acc and len(acc) > last_saved_len:
                try:
                    await reading_service.update_report_text(db, ctx, acc)
                except Exception:
                    logger.exception("异常时保存失败")
            try:
                balance = await reading_service.refund(db, ctx)
            except Exception:
                logger.exception("退积分失败")
                balance = ctx.balance_after
            yield _sse_event("error", {
                "code": 50002,
                "message": f"AI 服务异常：{exc}",
                "refunded": ctx.points_spent,
                "balance_after": balance,
            })
        finally:
            if cancelled:
                logger.info("断流已记录，report_id=%s，用户可在「我的报告」找回", ctx.report_id)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # nginx 关闭缓冲
        },
    )


@router.get("/reports", response_model=ApiResponse[Paginated[ReadingReportBriefOut]])
async def list_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Paginated[ReadingReportBriefOut]]:
    rows, total = await reading_service.list_reports(
        db, user.id, page=page, page_size=page_size
    )
    items = [
        ReadingReportBriefOut(
            id=str(r.id),
            template_name=tname,
            excerpt=reading_service.excerpt(r.ai_response, 100),
            created_at=to_iso(r.created_at) or "",
        )
        for r, tname in rows
    ]
    return ok(
        Paginated[ReadingReportBriefOut](
            items=items, total=total, page=page, page_size=page_size,
        )
    )


@router.get("/reports/{report_id}", response_model=ApiResponse[ReadingReportOut])
async def get_report(
    report_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[ReadingReportOut]:
    try:
        rid = uuid.UUID(report_id)
    except ValueError:
        raise ReportNotFoundError()
    r = await reading_service.get_report(db, user.id, rid)
    return ok(
        ReadingReportOut(
            id=str(r.id),
            user_id=str(r.user_id),
            template_id=str(r.template_id),
            template=None,
            chart_id=str(r.chart_id),
            ai_response=r.ai_response,
            # API 响应屏蔽真实 model 名（DB 仍存真值用于审计/统计），统一对外品牌
            model_name="灵犀神谕",
            token_usage=r.token_usage,
            points_spent=r.points_spent,
            share_token=r.share_token,
            created_at=to_iso(r.created_at) or "",
        )
    )
