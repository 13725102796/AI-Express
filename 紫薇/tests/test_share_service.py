"""share_service 单元测试."""
from __future__ import annotations

import asyncio
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from ziwei_app.core.exceptions import ReportNotFoundError, ShareTokenInvalidError
from ziwei_app.schemas.share import AIGC_WATERMARK
from ziwei_app.services import share_service


def _exec_scalar_one_or_none(val):
    r = MagicMock()
    r.scalar_one_or_none = MagicMock(return_value=val)
    return r


def _exec_first(val):
    r = MagicMock()
    r.first = MagicMock(return_value=val)
    return r


def test_create_share_report_not_found_raises():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_exec_scalar_one_or_none(None))
    with pytest.raises(ReportNotFoundError):
        asyncio.run(share_service.create_share(db, uuid.uuid4(), uuid.uuid4()))


def test_create_share_generates_token_when_missing():
    user_id = uuid.uuid4()
    report = SimpleNamespace(
        id=uuid.uuid4(), user_id=user_id, share_token=None, ai_response="内容"
    )

    calls = []

    async def exec_side_effect(*_a, **_k):
        calls.append(1)
        if len(calls) == 1:
            return _exec_scalar_one_or_none(report)   # 查 report
        # 后续每次查重 → 都返回 None（无冲突）
        return _exec_scalar_one_or_none(None)

    db = AsyncMock()
    db.execute = AsyncMock(side_effect=exec_side_effect)
    db.flush = AsyncMock()

    r, url = asyncio.run(share_service.create_share(db, user_id, report.id))
    assert r.share_token is not None
    assert len(r.share_token) >= 16
    assert url.endswith(f"/share/{r.share_token}")


def test_create_share_reuses_existing_token():
    user_id = uuid.uuid4()
    report = SimpleNamespace(
        id=uuid.uuid4(), user_id=user_id, share_token="existing_tok_abc", ai_response="x"
    )

    db = AsyncMock()
    db.execute = AsyncMock(return_value=_exec_scalar_one_or_none(report))
    db.flush = AsyncMock()

    r, url = asyncio.run(share_service.create_share(db, user_id, report.id))
    assert r.share_token == "existing_tok_abc"
    assert url.endswith("/share/existing_tok_abc")
    # 没有触发 flush 变更（只有读）
    db.flush.assert_not_called()


def test_get_public_share_invalid_token_raises():
    db = AsyncMock()
    with pytest.raises(ShareTokenInvalidError):
        asyncio.run(share_service.get_public_share(db, ""))
    with pytest.raises(ShareTokenInvalidError):
        asyncio.run(share_service.get_public_share(db, "short"))


def test_get_public_share_not_found_raises():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_exec_first(None))
    with pytest.raises(ShareTokenInvalidError):
        asyncio.run(share_service.get_public_share(db, "validlongtoken1234"))


def test_get_public_share_returns_report_and_template():
    report = SimpleNamespace(id=uuid.uuid4(), ai_response="abc")
    tpl = SimpleNamespace(id=uuid.uuid4(), name="命宫初探")
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_exec_first((report, tpl)))

    r, t = asyncio.run(share_service.get_public_share(db, "tokenlongabcdef"))
    assert r is report
    assert t is tpl


def test_excerpt_long_text_truncated():
    txt = "测" * 600
    out = share_service.excerpt(txt, 500)
    assert len(out) == 501   # 500 + 省略号
    assert out.endswith("…")


def test_excerpt_within_limit_unchanged():
    assert share_service.excerpt("短内容", 500) == "短内容"


def test_watermark_text_constant():
    assert "AI" in AIGC_WATERMARK
    assert "仅供" in AIGC_WATERMARK


def test_build_share_url_trims_trailing_slash():
    # 通过 monkeypatch settings.SHARE_BASE_URL
    from ziwei_app.core import config
    original = config.settings.SHARE_BASE_URL
    try:
        config.settings.SHARE_BASE_URL = "https://example.com/"
        assert share_service._build_share_url("abc123") == "https://example.com/share/abc123"
    finally:
        config.settings.SHARE_BASE_URL = original
