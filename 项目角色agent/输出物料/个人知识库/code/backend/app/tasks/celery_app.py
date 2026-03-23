"""
Celery 异步任务配置
"""
from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "knowbase",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,  # 每次只取一个任务，适合长时间任务
)

# 自动发现任务
celery_app.autodiscover_tasks(["app.tasks"])
