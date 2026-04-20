"""排盘模块 schemas — 与 shared-types.md §3.3 对齐."""
from __future__ import annotations

from typing import Any, Dict

from pydantic import BaseModel


class ChartDataOut(BaseModel):
    id: str
    user_id: str
    profile_id: str
    chart_json: Dict[str, Any]
    chart_text: str
    api_params: Dict[str, Any]
    created_at: str
