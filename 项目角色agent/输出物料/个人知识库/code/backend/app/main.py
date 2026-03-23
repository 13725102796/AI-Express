"""
KnowBase FastAPI 应用入口
"""
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from app.config import get_settings
from app.database import engine
from app.models.database import Base

# 导入路由
from app.routers import auth, documents, chat, search, spaces, users, health

settings = get_settings()


# ============================================================
# 生命周期管理
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动/关闭时的生命周期事件"""
    logger.info(f"Starting {settings.APP_NAME} (env={settings.APP_ENV})")
    # 创建数据库表（开发环境用，生产应使用 Alembic 迁移）
    if settings.APP_ENV == "development":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created (development mode)")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}")
    await engine.dispose()


# ============================================================
# 创建 FastAPI 应用
# ============================================================

app = FastAPI(
    title=settings.APP_NAME,
    description="个人知识库后端 API — AI 驱动的知识管理与问答系统",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
)


# ============================================================
# 中间件
# ============================================================

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 请求日志中间件
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(
        f"{request.method} {request.url.path} "
        f"status={response.status_code} duration={duration:.3f}s"
    )
    return response


# ============================================================
# 统一错误处理
# ============================================================

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"error": "NOT_FOUND", "message": "请求的资源不存在"},
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    logger.error(f"Internal error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "INTERNAL_ERROR", "message": "服务器内部错误，请稍后重试"},
    )


@app.exception_handler(422)
async def validation_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=422,
        content={"error": "VALIDATION_ERROR", "message": "请求参数校验失败", "details": str(exc)},
    )


# ============================================================
# 注册路由
# ============================================================

app.include_router(health.router, prefix="/api", tags=["健康检查"])
app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
# 搜索路由必须在文档路由之前注册，否则 /api/documents/search 会被
# documents.router 的 /{doc_id} 贪婪匹配（FastAPI 按注册顺序匹配）
app.include_router(search.router, prefix="/api", tags=["搜索"])
app.include_router(documents.router, prefix="/api/documents", tags=["文档管理"])
app.include_router(chat.router, prefix="/api/chat", tags=["AI 问答"])
app.include_router(spaces.router, prefix="/api/spaces", tags=["知识空间"])
app.include_router(users.router, prefix="/api/users", tags=["用户设置"])
