"""认证 schema 校验单元测试."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from ziwei_app.schemas.auth import LoginReq, RegisterReq


def test_register_req_valid():
    req = RegisterReq(phone="13812345678", password="abcdefgh", invite_code=None)
    assert req.phone == "13812345678"


def test_register_req_phone_invalid():
    with pytest.raises(ValidationError):
        RegisterReq(phone="2381234567X", password="abcdefgh")


def test_register_req_phone_too_short():
    with pytest.raises(ValidationError):
        RegisterReq(phone="138", password="abcdefgh")


def test_register_req_password_too_short():
    with pytest.raises(ValidationError):
        RegisterReq(phone="13812345678", password="abc")


def test_register_req_invite_code_must_be_8():
    with pytest.raises(ValidationError):
        RegisterReq(phone="13812345678", password="abcdefgh", invite_code="ABC")


def test_login_req_valid():
    req = LoginReq(phone="13912345678", password="my-password-1")
    assert req.password == "my-password-1"


def test_login_req_password_min_length():
    with pytest.raises(ValidationError):
        LoginReq(phone="13912345678", password="short")
