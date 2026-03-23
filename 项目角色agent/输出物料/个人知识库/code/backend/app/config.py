"""
应用配置管理 - 从环境变量读取所有配置项
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """全局配置，自动从 .env 文件或环境变量读取"""

    # 应用
    APP_NAME: str = "KnowBase"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-to-a-random-string"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:8000"

    # 数据库
    DATABASE_URL: str = "postgresql+asyncpg://knowbase:knowbase123@localhost:5432/knowbase"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET_KEY: str = "change-me-jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # 文件上传
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 50

    # LLM（优先使用本地 Claude CLI，无需 API key）
    CLAUDE_CLI_PATH: str = ""  # 留空自动检测（~/.local/bin/claude）
    OPENAI_API_KEY: str = ""  # fallback: OpenAI 兼容 API
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-4o"
    EMBEDDING_MODEL: str = "BAAI/bge-m3"
    EMBEDDING_DIMENSION: int = 1024
    EMBEDDING_BATCH_SIZE: int = 32  # Apple Silicon 推荐 32
    RERANKER_MODEL: str = "BAAI/bge-reranker-v2-m3"

    # 检索参数
    RETRIEVAL_TOP_K: int = 50          # 一级召回数量
    RETRIEVAL_RERANK_TOP_K: int = 10   # Reranker 精排后保留数量
    RETRIEVAL_SCORE_THRESHOLD: float = 0.3  # 最低相似度阈值
    RRF_K: int = 60                    # RRF 融合参数

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # 文件存储
    STORAGE_BACKEND: str = "local"  # local | r2
    R2_ENDPOINT: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "knowbase"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    # 生产环境安全校验：禁止使用默认密钥启动
    if s.APP_ENV == "production":
        _default_secrets = {
            "SECRET_KEY": "change-me-to-a-random-string",
            "JWT_SECRET_KEY": "change-me-jwt-secret",
        }
        for field, default_val in _default_secrets.items():
            if getattr(s, field) == default_val:
                raise RuntimeError(
                    f"安全错误: 生产环境禁止使用默认 {field}，"
                    f"请通过环境变量或 .env 文件设置一个安全的随机值"
                )
    return s
