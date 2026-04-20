"""分享模块 schemas — 与 shared-types.md §3.7 对齐."""
from __future__ import annotations

from pydantic import BaseModel


# AIGC 水印文案（PRD 硬约束：分享页必须带水印文本）
AIGC_WATERMARK = "本内容由 AI 生成 · 仅供文化娱乐参考"


class CreateShareRespData(BaseModel):
    share_token: str
    share_url: str
    watermark_text: str = AIGC_WATERMARK


class PublicShareData(BaseModel):
    template_name: str
    excerpt: str                 # ≤ 500 字
    created_at: str
    watermark_text: str = AIGC_WATERMARK
    cta_text: str = "进入紫微灵犀获取完整解读"
