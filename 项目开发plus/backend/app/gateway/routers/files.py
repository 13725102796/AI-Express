"""
文件服务 — 上传文件 + 浏览输出目录 + 读取文件内容 + 预览产出物
"""
from __future__ import annotations

import mimetypes
import os
import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from loguru import logger

from aiexpress.config import config

router = APIRouter()

UPLOAD_DIR = Path(os.path.abspath(config.output.base_dir)) / "_uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _get_output_base() -> Path:
    return Path(os.path.abspath(config.output.base_dir))


def _safe_path(requested: str) -> Path:
    """安全路径解析：防止路径穿越"""
    base = _get_output_base()
    resolved = (base / requested).resolve()
    if not str(resolved).startswith(str(base.resolve())):
        raise HTTPException(403, "路径不允许")
    return resolved


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """上传文件，返回服务端路径供 Claude 读取"""
    dest = UPLOAD_DIR / file.filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    logger.info(f"文件上传: {file.filename} → {dest}")
    return {
        "filename": file.filename,
        "path": str(dest),
        "size": dest.stat().st_size,
    }


@router.post("/upload-multiple")
async def upload_multiple(files: list[UploadFile] = File(...)):
    """批量上传文件"""
    results = []
    for file in files:
        dest = UPLOAD_DIR / file.filename
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)
        results.append({
            "filename": file.filename,
            "path": str(dest),
            "size": dest.stat().st_size,
        })
    logger.info(f"批量上传 {len(results)} 个文件")
    return {"files": results}


@router.get("/tree")
async def file_tree(project: str | None = None):
    """获取输出目录的文件树"""
    base = _get_output_base()
    if project:
        base = base / project

    if not base.exists():
        return {"tree": []}

    def build_tree(path: Path, depth: int = 0) -> list[dict]:
        if depth > 5:
            return []
        items = []
        try:
            for entry in sorted(path.iterdir(), key=lambda e: (e.is_file(), e.name)):
                node = {
                    "name": entry.name,
                    "path": str(entry.relative_to(_get_output_base())),
                    "type": "directory" if entry.is_dir() else "file",
                }
                if entry.is_file():
                    node["size"] = entry.stat().st_size
                    node["modified_at"] = entry.stat().st_mtime
                elif entry.is_dir():
                    node["children"] = build_tree(entry, depth + 1)
                items.append(node)
        except PermissionError:
            pass
        return items

    return {"tree": build_tree(base)}


@router.get("/read/{path:path}")
async def read_file(path: str):
    """读取文件内容（文本文件返回内容，二进制返回下载）"""
    resolved = _safe_path(path)
    if not resolved.exists():
        raise HTTPException(404, "文件不存在")
    if resolved.is_dir():
        raise HTTPException(400, "不能读取目录")

    mime, _ = mimetypes.guess_type(str(resolved))
    mime = mime or "application/octet-stream"

    # 文本文件返回内容
    text_types = {"text/", "application/json", "application/javascript", "application/xml"}
    is_text = any(mime.startswith(t) for t in text_types) or resolved.suffix in {
        ".md", ".py", ".ts", ".tsx", ".js", ".jsx", ".css", ".yaml", ".yml", ".toml", ".env", ".sql",
    }

    if is_text:
        try:
            content = resolved.read_text(encoding="utf-8")
            return {"path": path, "content": content, "mime_type": mime, "size": len(content)}
        except UnicodeDecodeError:
            pass

    # 二进制文件直接返回
    return FileResponse(resolved, media_type=mime)


@router.get("/preview/{path:path}")
async def preview_file(path: str):
    """预览文件（HTML 直接返回，用于 iframe）"""
    resolved = _safe_path(path)
    if not resolved.exists():
        raise HTTPException(404, "文件不存在")

    mime, _ = mimetypes.guess_type(str(resolved))
    return FileResponse(resolved, media_type=mime or "text/html")
