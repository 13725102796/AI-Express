"""
M5: 用户设置路由
- PATCH  /api/users/me                     更新用户信息
- PATCH  /api/users/me/password            修改密码
- POST   /api/users/me/avatar              上传头像
- GET    /api/users/me/usage               用量统计
- GET    /api/users/me/bindings            第三方绑定列表
- POST   /api/users/me/bindings/:provider  绑定第三方账号
- POST   /api/export                       数据导出
- DELETE /api/users/me                     删除账户
"""
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext
from loguru import logger

from app.database import get_db
from app.dependencies import get_current_user
from app.models.database import User, Space, Document, Conversation, Message, OAuthAccount
from app.models.schemas import (
    UpdateUserRequest, ChangePasswordRequest, UserResponse,
    UsageResponse, ExportResponse,
    OAuthBindingItem, OAuthBindingsResponse, BindProviderRequest,
)
from app.services.file_storage import file_storage

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================================================
# PATCH /me — 更新用户信息
# ============================================================

@router.patch("/me", response_model=UserResponse)
async def update_user(
    body: UpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """更新用户名称"""
    if body.name is not None:
        user.name = body.name

    await db.flush()
    return user


# ============================================================
# PATCH /me/password — 修改密码
# ============================================================

@router.patch("/me/password")
async def change_password(
    body: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """修改密码，需要验证当前密码"""
    if not user.password_hash:
        raise HTTPException(
            status_code=400,
            detail={"error": "NO_PASSWORD", "message": "当前账户使用 OAuth 登录，无法修改密码"},
        )

    if not pwd_context.verify(body.current_password, user.password_hash):
        raise HTTPException(
            status_code=400,
            detail={"error": "WRONG_PASSWORD", "message": "当前密码错误"},
        )

    user.password_hash = pwd_context.hash(body.new_password)
    await db.flush()

    return {"success": True, "message": "密码修改成功"}


# ============================================================
# POST /me/avatar — 上传头像
# ============================================================

@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """上传用户头像。支持 PNG、JPG，最大 5MB。"""
    if not file.filename:
        raise HTTPException(status_code=400, detail={"error": "NO_FILE", "message": "请选择文件"})

    ext = Path(file.filename).suffix.lower()
    if ext not in {".png", ".jpg", ".jpeg", ".webp"}:
        raise HTTPException(
            status_code=400,
            detail={"error": "UNSUPPORTED_FORMAT", "message": "头像仅支持 PNG、JPG、WebP 格式"},
        )

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail={"error": "FILE_TOO_LARGE", "message": "头像文件不能超过 5MB"},
        )

    # 保存头像
    await file.seek(0)
    avatar_dir = Path(file_storage.upload_dir) / "avatars"
    avatar_dir.mkdir(parents=True, exist_ok=True)
    avatar_path = avatar_dir / f"{user.id}{ext}"

    import aiofiles
    async with aiofiles.open(avatar_path, "wb") as f:
        await f.write(content)

    # 更新用户头像路径
    user.image = f"/uploads/avatars/{user.id}{ext}"
    await db.flush()

    return {"success": True, "image": user.image}


# ============================================================
# GET /me/usage — 用量统计
# ============================================================

@router.get("/me/usage", response_model=UsageResponse)
async def get_usage(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取当前用户的用量统计"""
    # 文档数
    doc_count_result = await db.execute(
        select(func.count()).where(Document.user_id == user.id)
    )
    doc_count = doc_count_result.scalar() or 0

    # 存储量
    storage_result = await db.execute(
        select(func.coalesce(func.sum(Document.file_size), 0))
        .where(Document.user_id == user.id)
    )
    storage_bytes = storage_result.scalar() or 0

    # AI 问答次数（本月）
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    ai_query_result = await db.execute(
        select(func.count())
        .select_from(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(
            Conversation.user_id == user.id,
            Message.role == "user",
            Message.created_at >= month_start,
        )
    )
    ai_queries = ai_query_result.scalar() or 0

    # 知识空间数
    space_count_result = await db.execute(
        select(func.count()).where(Space.user_id == user.id)
    )
    space_count = space_count_result.scalar() or 0

    # 配额
    plan = user.plan or "free"
    doc_limit = 100 if plan == "free" else 10000
    storage_limit_mb = 500 if plan == "free" else 50000
    ai_limit = 200 if plan == "free" else 99999
    space_limit = 3 if plan == "free" else 999

    return UsageResponse(
        documents={"used": doc_count, "limit": doc_limit},
        storage={"usedMB": round(storage_bytes / (1024 * 1024), 2), "limitMB": storage_limit_mb},
        ai_queries={"usedThisMonth": ai_queries, "limitPerMonth": ai_limit},
        spaces={"used": space_count, "limit": space_limit},
    )


# ============================================================
# GET /me/bindings — 第三方绑定列表
# ============================================================

@router.get("/me/bindings", response_model=OAuthBindingsResponse)
async def get_bindings(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取当前用户的第三方账号绑定列表"""
    result = await db.execute(
        select(OAuthAccount).where(OAuthAccount.user_id == user.id)
    )
    accounts = result.scalars().all()

    # 构建已绑定的 provider 映射
    bound_map = {}
    for acc in accounts:
        bound_map[acc.provider] = OAuthBindingItem(
            provider=acc.provider,
            bound=True,
            name=acc.provider_account_id,  # 实际应存显示名称
            bound_at=None,
        )

    # 补充支持但未绑定的 provider
    supported_providers = ["google", "github", "wechat"]
    bindings = []
    for provider in supported_providers:
        if provider in bound_map:
            bindings.append(bound_map[provider])
        else:
            bindings.append(OAuthBindingItem(provider=provider, bound=False))

    return OAuthBindingsResponse(bindings=bindings)


# ============================================================
# POST /me/bindings/:provider — 绑定第三方账号
# ============================================================

@router.post("/me/bindings/{provider}")
async def bind_provider(
    provider: str,
    body: BindProviderRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """绑定第三方账号到当前用户"""
    supported_providers = ["google", "github", "wechat"]
    if provider not in supported_providers:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "UNSUPPORTED_PROVIDER",
                "message": f"不支持的认证方式: {provider}，支持: {', '.join(supported_providers)}",
            },
        )

    # 检查是否已绑定该 provider
    existing = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.user_id == user.id,
            OAuthAccount.provider == provider,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail={"error": "ALREADY_BOUND", "message": f"已绑定 {provider} 账号，请先解绑再重新绑定"},
        )

    # TODO: 用 body.code 和 body.redirect_uri 向 OAuth Provider 换取 access_token 并获取用户信息
    # 此处为框架实现，实际需配置各 Provider 的 Client ID/Secret
    oauth_account = OAuthAccount(
        user_id=user.id,
        provider=provider,
        provider_account_id=f"{provider}_placeholder_{body.code[:8]}",
        access_token="",  # 实际应存储真实 token
    )
    db.add(oauth_account)
    await db.flush()

    logger.info(f"第三方账号绑定: user_id={user.id}, provider={provider}")
    return {"success": True, "provider": provider, "message": f"{provider} 账号绑定成功"}


# ============================================================
# POST /export — 数据导出
# ============================================================

@router.post("/export", response_model=ExportResponse, status_code=202)
async def export_data(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    发起数据导出请求。
    生产环境应使用 Celery 异步任务打包用户所有数据。
    """
    export_id = str(uuid.uuid4())[:8]

    # TODO: 实际实现应创建 Celery 任务
    # 任务内容: 打包用户所有文档原始文件 + 提取内容 + 元数据为 ZIP
    logger.info(f"数据导出请求: user_id={user.id}, export_id={export_id}")

    return ExportResponse(
        export_id=export_id,
        status="processing",
        estimated_time="120s",
    )


# ============================================================
# DELETE /me — 删除账户
# ============================================================

@router.delete("/me")
async def delete_account(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    删除用户账户及全部关联数据。
    此操作不可逆。
    """
    logger.warning(f"用户账户删除: user_id={user.id}, email={user.email}")

    # 级联删除会自动清理 spaces, documents, conversations 等
    await db.delete(user)
    await db.flush()

    return {"success": True, "message": "账户已删除"}
