"""Gemini API 封装（google-genai 1.x 新统一 SDK）.

- 支持流式 async generate
- 超时 / 基本重试透传给上层（reading_service 捕获异常后退积分）
- 测试可用 set_client() 注入 fake
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, AsyncIterator, Callable, Optional

from ziwei_app.core.config import settings

logger = logging.getLogger(__name__)


class FakeChunk:
    """用于单测的简单 chunk（.text 属性）."""
    def __init__(self, text: str):
        self.text = text


_ACTIVE_CLIENT: Optional["GeminiClient"] = None


class GeminiClient:
    """
    LLM 流式客户端 — 双协议自适应：
    - 设了 GEMINI_BASE_URL → 走 OpenAI 兼容协议（适配中转 API，如 api.ttk.homes/v1）
    - 否则 → 走 Google `google-genai` 1.x 官方 SDK
    - 测试注入：set_client(FakeGeminiClient())。
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout_sec: Optional[int] = None,
        base_url: Optional[str] = None,
    ):
        # 显式传 "" 视为"清空"（测试用），不回退到 settings
        self.api_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        self.model = model if model is not None else settings.GEMINI_MODEL
        self.timeout_sec = (
            timeout_sec if timeout_sec is not None else settings.GEMINI_TIMEOUT_SEC
        )
        self.base_url = base_url if base_url is not None else settings.GEMINI_BASE_URL
        self._client = None
        self._mode: Optional[str] = None  # "openai" or "google"

    def _ensure_client(self):
        if self._client is not None:
            return
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY 未配置")
        if self.base_url:
            try:
                from openai import AsyncOpenAI  # type: ignore
            except Exception as e:
                raise RuntimeError(f"openai SDK 未安装：{e}")
            self._client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
            self._mode = "openai"
        else:
            try:
                from google import genai  # type: ignore
            except Exception as e:
                raise RuntimeError(f"google-genai SDK 未安装：{e}")
            self._client = genai.Client(api_key=self.api_key)
            self._mode = "google"

    async def stream_generate(self, prompt: str) -> AsyncIterator[Any]:
        """
        流式生成。按 chunk yield（每个 chunk.text 可直接拼接）。
        OpenAI 协议下用 FakeChunk 包装 delta.content，保持上层 reading.py 不变。
        外层应捕获一切异常并调用 reading_service.refund。
        """
        self._ensure_client()
        if self._mode == "openai":
            try:
                async with asyncio.timeout(self.timeout_sec):
                    stream = await self._client.chat.completions.create(
                        model=self.model,
                        messages=[{"role": "user", "content": prompt}],
                        stream=True,
                        temperature=0.7,
                        max_tokens=2048,
                    )
                    async for chunk in stream:
                        try:
                            delta = chunk.choices[0].delta.content or ""
                        except (IndexError, AttributeError):
                            delta = ""
                        if delta:
                            yield FakeChunk(delta)
            except asyncio.TimeoutError:
                raise RuntimeError(f"LLM 调用超时（{self.timeout_sec}s）")
            return

        from google.genai import types as genai_types  # type: ignore
        config = genai_types.GenerateContentConfig(
            temperature=0.7, max_output_tokens=2048,
        )
        try:
            async with asyncio.timeout(self.timeout_sec):
                async for chunk in await self._client.aio.models.generate_content_stream(
                    model=self.model,
                    contents=prompt,
                    config=config,
                ):
                    if getattr(chunk, "text", None):
                        yield chunk
        except asyncio.TimeoutError:
            raise RuntimeError(f"Gemini 调用超时（{self.timeout_sec}s）")


def get_client() -> GeminiClient:
    """懒加载单例 client."""
    global _ACTIVE_CLIENT
    if _ACTIVE_CLIENT is None:
        _ACTIVE_CLIENT = GeminiClient()
    return _ACTIVE_CLIENT


def set_client(client: Any) -> None:
    """测试用：注入自定义 client（只需有 stream_generate 方法）."""
    global _ACTIVE_CLIENT
    _ACTIVE_CLIENT = client


def reset_client() -> None:
    global _ACTIVE_CLIENT
    _ACTIVE_CLIENT = None


# ──────────────────────────────────────────────
# 测试辅助：FakeGeminiClient
# ──────────────────────────────────────────────

class FakeGeminiClient:
    """返回固定 chunk 序列或由 producer 生成的 chunks."""
    def __init__(self, chunks: Optional[list[str]] = None,
                 producer: Optional[Callable[[str], list[str]]] = None,
                 raise_exc: Optional[Exception] = None,
                 model: str = "gemini-2.5-pro"):
        self.chunks = chunks or []
        self.producer = producer
        self.raise_exc = raise_exc
        self.model = model
        self.last_prompt: Optional[str] = None

    async def stream_generate(self, prompt: str) -> AsyncIterator[FakeChunk]:
        self.last_prompt = prompt
        if self.raise_exc:
            raise self.raise_exc
        parts = self.producer(prompt) if self.producer else self.chunks
        for p in parts:
            yield FakeChunk(p)
