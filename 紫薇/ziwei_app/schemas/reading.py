"""AI 解读模块 schemas — 与 shared-types.md §3.6 对齐."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class StartReadingReq(BaseModel):
    template_id: str


class ReadingReportOut(BaseModel):
    id: str
    user_id: str
    template_id: str
    template: Optional[dict] = None       # 简要 template 信息
    chart_id: str
    ai_response: str
    model_name: str
    token_usage: Optional[Dict[str, Any]] = None
    points_spent: int
    share_token: Optional[str] = None
    created_at: str


class ReadingReportBriefOut(BaseModel):
    id: str
    template_name: str
    excerpt: str          # 前 100 字
    created_at: str


class PaginatedReports(BaseModel):
    items: List[ReadingReportBriefOut]
    total: int
    page: int
    page_size: int
