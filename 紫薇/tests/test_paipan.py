"""现有 3 端点 + 新增 /paipan/solar/json 回归测试."""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app import app


@pytest.mark.asyncio
async def test_paipan_lunar_text():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get(
            "/paipan",
            params={"year": 1996, "month": 7, "day": 28, "time_index": 5, "gender": "男"},
        )
        assert resp.status_code == 200
        text = resp.text
        assert "紫微斗数命盘" in text
        assert "命宫" in text


@pytest.mark.asyncio
async def test_paipan_solar_text():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get(
            "/paipan/solar",
            params={"date": "1996-9-10", "time_index": 5, "gender": "男"},
        )
        assert resp.status_code == 200
        assert "紫微斗数命盘" in resp.text


@pytest.mark.asyncio
async def test_paipan_lunar_json():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get(
            "/paipan/json",
            params={"year": 1996, "month": 7, "day": 28, "time_index": 5, "gender": "男"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "palaces" in data
        assert "soulMaster" in data
        assert "bodyMaster" in data
        assert "douJun" in data
        assert len(data["palaces"]) == 12


@pytest.mark.asyncio
async def test_paipan_solar_json_new_endpoint():
    """【新增端点验证】PRD Q5 决策实施."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get(
            "/paipan/solar/json",
            params={"date": "1996-9-10", "time_index": 5, "gender": "男"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "palaces" in data
        assert "soulMaster" in data
        assert "bodyMaster" in data
        assert "douJun" in data
        assert len(data["palaces"]) == 12


@pytest.mark.asyncio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
