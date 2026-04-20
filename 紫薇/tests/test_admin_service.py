"""admin_service 单元测试（mock DB 覆盖分支）."""
from __future__ import annotations

import asyncio
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from ziwei_app.core.exceptions import (
    AdminUnauthorizedError,
    TemplateNameDuplicateError,
    TemplateNotFoundError,
)
from ziwei_app.core.security import hash_password
from ziwei_app.services import admin_service


def _exec_scalar_one_or_none(val):
    r = MagicMock()
    r.scalar_one_or_none = MagicMock(return_value=val)
    return r


def _exec_scalar_one(val):
    r = MagicMock()
    r.scalar_one = MagicMock(return_value=val)
    return r


# ──────────────────────────────────────────────
# Schema 校验
# ──────────────────────────────────────────────

def test_admin_login_req_valid():
    from ziwei_app.schemas.admin import AdminLoginReq
    req = AdminLoginReq(username="admin", password="123456")
    assert req.username == "admin"


def test_admin_login_req_short_username():
    from pydantic import ValidationError
    from ziwei_app.schemas.admin import AdminLoginReq
    with pytest.raises(ValidationError):
        AdminLoginReq(username="a", password="123456")


def test_admin_login_req_short_password():
    from pydantic import ValidationError
    from ziwei_app.schemas.admin import AdminLoginReq
    with pytest.raises(ValidationError):
        AdminLoginReq(username="admin", password="12")


def test_admin_create_template_req_tags_default():
    from ziwei_app.schemas.admin import AdminCreateTemplateReq
    req = AdminCreateTemplateReq(
        name="x", description="y", detail="d",
        prompt_content="p", points_cost=0,
    )
    assert req.tags == []
    assert req.sort_order == 0


def test_admin_toggle_status_req_minimal():
    from ziwei_app.schemas.admin import AdminToggleStatusReq
    req = AdminToggleStatusReq(status="active")
    assert req.status == "active"


def test_admin_update_config_req_value_non_negative():
    from pydantic import ValidationError
    from ziwei_app.schemas.admin import AdminUpdateConfigReq
    with pytest.raises(ValidationError):
        AdminUpdateConfigReq(value=-1)


# ──────────────────────────────────────────────
# Service：login
# ──────────────────────────────────────────────

def test_admin_login_user_not_found_raises():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_exec_scalar_one_or_none(None))
    with pytest.raises(AdminUnauthorizedError):
        asyncio.run(admin_service.admin_login(db, "nobody", "abcdef"))


def test_admin_login_wrong_password_raises():
    admin = SimpleNamespace(
        id=uuid.uuid4(),
        username="admin",
        password_hash=hash_password("correct_pw"),
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_exec_scalar_one_or_none(admin))
    with pytest.raises(AdminUnauthorizedError):
        asyncio.run(admin_service.admin_login(db, "admin", "wrong_pw"))


def test_admin_login_success_returns_token():
    admin = SimpleNamespace(
        id=uuid.uuid4(),
        username="admin",
        password_hash=hash_password("correct_pw"),
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_exec_scalar_one_or_none(admin))
    a, token, expires = asyncio.run(
        admin_service.admin_login(db, "admin", "correct_pw")
    )
    assert a is admin
    assert isinstance(token, str) and len(token) > 40
    assert expires > 0


# ──────────────────────────────────────────────
# Service：template CRUD
# ──────────────────────────────────────────────

def test_admin_create_template_duplicate_name_raises():
    # 第 1 次 execute 返回存在的 id
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_exec_scalar_one_or_none(uuid.uuid4()))
    payload = {
        "name": "重名", "description": "d", "detail": "x",
        "prompt_content": "p", "tags": [], "points_cost": 0, "sort_order": 0,
    }
    with pytest.raises(TemplateNameDuplicateError):
        asyncio.run(admin_service.admin_create_template(db, payload))


def test_admin_update_template_not_found():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_exec_scalar_one_or_none(None))
    with pytest.raises(TemplateNotFoundError):
        asyncio.run(admin_service.admin_update_template(db, uuid.uuid4(), {"name": "x"}))


def test_admin_update_template_applies_patch():
    tpl = SimpleNamespace(
        id=uuid.uuid4(), name="A", description="d", detail="t",
        prompt_content="p", tags=[], points_cost=0, preview_image_url=None,
        sort_order=0, status="active", unlock_count=0,
    )
    calls = []

    async def exec_side_effect(*_a, **_k):
        calls.append(1)
        if len(calls) == 1:
            return _exec_scalar_one_or_none(tpl)
        return _exec_scalar_one_or_none(None)  # 改名时查重 → 无

    db = AsyncMock()
    db.execute = AsyncMock(side_effect=exec_side_effect)
    db.flush = AsyncMock()

    patch = {"name": "B", "points_cost": 20, "tags": ["事业"]}
    result = asyncio.run(admin_service.admin_update_template(db, tpl.id, patch))
    assert result.name == "B"
    assert result.points_cost == 20
    assert result.tags == ["事业"]


def test_admin_update_template_rename_to_existing_raises():
    tpl = SimpleNamespace(
        id=uuid.uuid4(), name="A", description="d", detail="t",
        prompt_content="p", tags=[], points_cost=0, preview_image_url=None,
        sort_order=0, status="active", unlock_count=0,
    )
    calls = []

    async def exec_side_effect(*_a, **_k):
        calls.append(1)
        if len(calls) == 1:
            return _exec_scalar_one_or_none(tpl)
        return _exec_scalar_one_or_none(uuid.uuid4())  # 查重 → 有同名

    db = AsyncMock()
    db.execute = AsyncMock(side_effect=exec_side_effect)

    with pytest.raises(TemplateNameDuplicateError):
        asyncio.run(admin_service.admin_update_template(db, tpl.id, {"name": "B"}))


def test_admin_toggle_status_invalid_raises():
    db = AsyncMock()
    with pytest.raises(ValueError):
        asyncio.run(admin_service.admin_toggle_status(db, uuid.uuid4(), "bogus"))


def test_admin_toggle_status_not_found():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_exec_scalar_one_or_none(None))
    with pytest.raises(TemplateNotFoundError):
        asyncio.run(admin_service.admin_toggle_status(db, uuid.uuid4(), "inactive"))


def test_admin_delete_template_sets_status_deleted():
    tpl = SimpleNamespace(id=uuid.uuid4(), status="active")
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_exec_scalar_one_or_none(tpl))
    db.flush = AsyncMock()
    asyncio.run(admin_service.admin_delete_template(db, tpl.id))
    assert tpl.status == "deleted"


# ──────────────────────────────────────────────
# Service：points config
# ──────────────────────────────────────────────

def test_admin_update_config_unknown_key_raises():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_exec_scalar_one_or_none(None))
    from ziwei_app.core.exceptions import BizError
    with pytest.raises(BizError):
        asyncio.run(admin_service.admin_update_points_config(db, "not_exist", 10))


def test_admin_update_config_valid():
    cfg = SimpleNamespace(id=uuid.uuid4(), key="register_bonus", value=100)
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_exec_scalar_one_or_none(cfg))
    db.flush = AsyncMock()
    result = asyncio.run(admin_service.admin_update_points_config(db, "register_bonus", 200))
    assert result.value == 200
