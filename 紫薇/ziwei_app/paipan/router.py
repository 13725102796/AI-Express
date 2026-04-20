"""排盘 API：保留原 3 端点 + 新增 /paipan/solar/json."""
from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import PlainTextResponse
from iztro_py import astro

from .formatter import build_tree, enrich_iztro_dict

router = APIRouter()


@router.get("/paipan", response_class=PlainTextResponse)
def paipan(
    year: int = Query(..., description="农历年（如 1996）"),
    month: int = Query(..., description="农历月"),
    day: int = Query(..., description="农历日"),
    time_index: int = Query(..., ge=0, le=12),
    gender: str = Query(..., description="性别: 男 或 女"),
    is_leap_month: bool = Query(False),
):
    date_str = f"{year}-{month}-{day}"
    chart = astro.by_lunar(date_str, time_index, gender, is_leap_month)
    iztro_dict = chart.to_iztro_dict()
    return build_tree(chart, iztro_dict)


@router.get("/paipan/solar", response_class=PlainTextResponse)
def paipan_solar(
    date: str = Query(..., description="阳历日期 YYYY-M-D"),
    time_index: int = Query(..., ge=0, le=12),
    gender: str = Query(..., description="性别: 男 或 女"),
):
    chart = astro.by_solar(date, time_index, gender)
    iztro_dict = chart.to_iztro_dict()
    return build_tree(chart, iztro_dict)


@router.get("/paipan/json")
def paipan_json(
    year: int = Query(...),
    month: int = Query(...),
    day: int = Query(...),
    time_index: int = Query(..., ge=0, le=12),
    gender: str = Query(...),
    is_leap_month: bool = Query(False),
):
    date_str = f"{year}-{month}-{day}"
    chart = astro.by_lunar(date_str, time_index, gender, is_leap_month)
    iztro_dict = chart.to_iztro_dict()
    return enrich_iztro_dict(chart, iztro_dict)


@router.get("/paipan/solar/json")
def paipan_solar_json(
    date: str = Query(..., description="阳历日期 YYYY-M-D"),
    time_index: int = Query(..., ge=0, le=12),
    gender: str = Query(..., description="性别: 男 或 女"),
):
    """【新增】阳历 JSON 排盘（PRD Q5）."""
    chart = astro.by_solar(date, time_index, gender)
    iztro_dict = chart.to_iztro_dict()
    return enrich_iztro_dict(chart, iztro_dict)


# 内部工具：供 chart_service 复用，避免 HTTP 自调用
def call_paipan_lunar_json(year: int, month: int, day: int, time_index: int,
                           gender: str, is_leap_month: bool = False) -> tuple[dict, str]:
    """返回 (json_dict, tree_text)."""
    date_str = f"{year}-{month}-{day}"
    chart = astro.by_lunar(date_str, time_index, gender, is_leap_month)
    iztro_dict = chart.to_iztro_dict()
    text = build_tree(chart, iztro_dict)
    enriched = enrich_iztro_dict(chart, iztro_dict)
    return enriched, text


def call_paipan_solar_json(date: str, time_index: int, gender: str) -> tuple[dict, str]:
    chart = astro.by_solar(date, time_index, gender)
    iztro_dict = chart.to_iztro_dict()
    text = build_tree(chart, iztro_dict)
    enriched = enrich_iztro_dict(chart, iztro_dict)
    return enriched, text
