"""
紫微灵犀 API — 统一入口

向后兼容（不破坏 Phase 0 已有调用方）：
  GET /paipan          —— 农历排盘（树形文本）
  GET /paipan/solar    —— 阳历排盘（树形文本）
  GET /paipan/json     —— 农历排盘（JSON）
  GET /paipan/solar/json  —— 阳历排盘（JSON）【Phase 2 新增，PRD Q5】

新增业务 API（前缀 /api/v1）：
  /api/v1/auth/*  /user/*  /chart/*  /points/*
  /api/v1/templates/*  /reading/*  /share/*
  /api/v1/admin/*
"""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ziwei_app.api.v1 import api_router
from ziwei_app.core.config import settings
from ziwei_app.core.exceptions import BizError
from ziwei_app.paipan.router import router as paipan_router

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL, logging.INFO))
logger = logging.getLogger("ziwei")

app = FastAPI(
    title="紫微灵犀 API",
    version="2.0.0",
    description="紫微斗数排盘引擎 + AI 国学解读平台",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(BizError)
async def biz_error_handler(request: Request, exc: BizError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.http_status,
        content={"code": exc.code, "data": None, "message": exc.message},
    )


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok", "service": "ziwei-api", "version": "2.0.0"}


# 已有 paipan 端点（不变）+ 新增 /paipan/solar/json
app.include_router(paipan_router, tags=["paipan"])

# 业务 API
app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.APP_DEBUG,
    )
