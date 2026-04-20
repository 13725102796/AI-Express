"""应用配置 — Pydantic Settings 读 .env."""
from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # 数据库
    DATABASE_URL: str = "postgresql+asyncpg://ziwei:ziwei@localhost:5432/ziwei"

    # JWT
    JWT_SECRET_USER: str = "dev-user-secret-change-in-production-32b"
    JWT_SECRET_ADMIN: str = "dev-admin-secret-change-in-production-32b"
    JWT_ACCESS_EXPIRE_DAYS: int = 7
    JWT_REFRESH_EXPIRE_DAYS: int = 30
    JWT_ADMIN_EXPIRE_HOURS: int = 8
    JWT_ALGORITHM: str = "HS256"

    # 加密 key（base64 32 bytes）
    PHONE_ENC_KEY: str = "Zk7q3dWxYzFvBsLpRtN5MhKjC2EuQwH8AaG6SiUoP1c="

    # Gemini / OpenAI 兼容中转（GEMINI_BASE_URL 非空时走 OpenAI 兼容协议）
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-pro"
    GEMINI_TIMEOUT_SEC: int = 60
    GEMINI_BASE_URL: str = ""

    # 管理员
    INITIAL_ADMIN_USERNAME: str = "admin"
    INITIAL_ADMIN_PASSWORD: str = "admin123change"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:8080,http://localhost:3000"

    # 服务
    APP_DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    # 分享
    SHARE_BASE_URL: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
