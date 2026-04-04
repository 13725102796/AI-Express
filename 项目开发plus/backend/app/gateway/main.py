"""
Gateway API — FastAPI 入口

提供：
- /api/threads — 会话管理
- /api/threads/{id}/run — 执行图（SSE 流式）
- /api/files — 文件服务
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from .routers import threads, files

app = FastAPI(title="AI Express Workbench", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:2026"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(threads.router, prefix="/api/threads", tags=["threads"])
app.include_router(files.router, prefix="/api/files", tags=["files"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "ai-express-gateway"}


@app.on_event("startup")
async def startup():
    logger.info("AI Express Gateway 启动")
