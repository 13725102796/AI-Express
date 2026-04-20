"""模板模块 schemas — 与 shared-types.md §3.5 对齐."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


class PromptTemplateOut(BaseModel):
    id: str
    name: str
    description: str
    detail: str
    prompt_content: Optional[str] = None   # 仅 admin 返回
    tags: List[str]
    points_cost: int
    preview_image_url: Optional[str] = None
    status: str
    unlock_count: int
    sort_order: int
    created_at: str
    updated_at: str
    is_unlocked: Optional[bool] = None     # 用户上下文填充


class UserTemplateOut(BaseModel):
    id: str
    user_id: str
    template_id: str
    template: Optional[PromptTemplateOut] = None
    points_spent: int
    unlocked_at: str


class UnlockTemplateRespData(BaseModel):
    user_template: UserTemplateOut
    balance: int
