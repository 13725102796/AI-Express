"""
文件存储服务 — 本地存储（开发）/ Cloudflare R2（生产）
"""
import os
import uuid
import aiofiles
from pathlib import Path
from fastapi import UploadFile

from app.config import get_settings

settings = get_settings()


class FileStorageService:
    """文件存储抽象层，支持本地和 R2 两种后端"""

    def __init__(self):
        self.backend = settings.STORAGE_BACKEND
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def save_upload(self, file: UploadFile, user_id: uuid.UUID, doc_id: uuid.UUID) -> str:
        """
        保存上传文件，返回存储路径（file_key）
        """
        if self.backend == "local":
            return await self._save_local(file, user_id, doc_id)
        else:
            return await self._save_r2(file, user_id, doc_id)

    async def _save_local(self, file: UploadFile, user_id: uuid.UUID, doc_id: uuid.UUID) -> str:
        """保存文件到本地文件系统"""
        user_dir = self.upload_dir / str(user_id)
        user_dir.mkdir(parents=True, exist_ok=True)

        ext = Path(file.filename).suffix if file.filename else ""
        file_key = f"{user_id}/{doc_id}{ext}"
        file_path = self.upload_dir / file_key

        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            await f.write(content)

        return file_key

    async def _save_r2(self, file: UploadFile, user_id: uuid.UUID, doc_id: uuid.UUID) -> str:
        """保存文件到 Cloudflare R2（预留接口）"""
        # TODO: 使用 boto3 S3 兼容 API 上传到 R2
        # import boto3
        # s3 = boto3.client('s3', endpoint_url=settings.R2_ENDPOINT, ...)
        raise NotImplementedError("R2 存储后端尚未实现")

    def get_file_path(self, file_key: str) -> Path:
        """获取本地文件的完整路径"""
        return self.upload_dir / file_key

    async def delete_file(self, file_key: str) -> bool:
        """删除文件"""
        if self.backend == "local":
            file_path = self.upload_dir / file_key
            if file_path.exists():
                os.remove(file_path)
                return True
            return False
        else:
            # TODO: R2 删除
            raise NotImplementedError("R2 存储后端尚未实现")


# 单例
file_storage = FileStorageService()
