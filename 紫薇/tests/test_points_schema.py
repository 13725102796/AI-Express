"""积分模块 schema 校验测试."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from ziwei_app.schemas.points import AdRewardReq, ShareRewardReq


def test_share_reward_req_report_id_optional():
    req = ShareRewardReq()
    assert req.report_id is None


def test_share_reward_req_with_report_id():
    req = ShareRewardReq(report_id="00000000-0000-0000-0000-000000000001")
    assert req.report_id is not None


def test_ad_reward_req_requires_token():
    with pytest.raises(ValidationError):
        AdRewardReq(ad_token="")


def test_ad_reward_req_valid():
    req = AdRewardReq(ad_token="tok_abc123")
    assert req.ad_token == "tok_abc123"
