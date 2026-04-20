"""Gemini client（含 FakeGeminiClient）单元测试."""
from __future__ import annotations

import asyncio

import pytest

from ziwei_app.services import gemini_client


@pytest.fixture(autouse=True)
def _reset():
    gemini_client.reset_client()
    yield
    gemini_client.reset_client()


def test_fake_client_yields_chunks():
    fake = gemini_client.FakeGeminiClient(chunks=["第一段 ", "第二段 ", "第三段"])
    gemini_client.set_client(fake)

    async def consume():
        out = []
        async for ch in gemini_client.get_client().stream_generate("test prompt"):
            out.append(ch.text)
        return "".join(out)

    result = asyncio.run(consume())
    assert result == "第一段 第二段 第三段"
    assert fake.last_prompt == "test prompt"


def test_fake_client_raises_exception():
    fake = gemini_client.FakeGeminiClient(raise_exc=RuntimeError("network down"))
    gemini_client.set_client(fake)

    async def consume():
        async for _ in gemini_client.get_client().stream_generate("p"):
            pass

    with pytest.raises(RuntimeError, match="network down"):
        asyncio.run(consume())


def test_fake_client_producer_mode():
    fake = gemini_client.FakeGeminiClient(
        producer=lambda p: [p, " 回显 ", "结束"]
    )
    gemini_client.set_client(fake)

    async def consume():
        out = []
        async for ch in gemini_client.get_client().stream_generate("hi"):
            out.append(ch.text)
        return "".join(out)

    assert asyncio.run(consume()) == "hi 回显 结束"


def test_real_client_without_api_key_raises_runtime_error():
    """真实 client 在未配置 API key 时调用应清晰报错."""
    client = gemini_client.GeminiClient(api_key="")

    async def consume():
        async for _ in client.stream_generate("x"):
            pass

    with pytest.raises(RuntimeError, match="GEMINI_API_KEY"):
        asyncio.run(consume())
