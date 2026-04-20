"""业务异常 + 错误码定义（与 shared-types.md §4 对齐）."""
from __future__ import annotations


class BizError(Exception):
    """业务异常基类，被全局异常处理器转为 JSON 响应."""
    code: int = -1
    http_status: int = 400
    default_message: str = "业务错误"

    def __init__(self, message: str | None = None, code: int | None = None,
                 http_status: int | None = None):
        self.message = message or self.default_message
        if code is not None:
            self.code = code
        if http_status is not None:
            self.http_status = http_status
        super().__init__(self.message)


# Auth 10xxx
class PhoneAlreadyRegisteredError(BizError):
    code, http_status, default_message = 10001, 400, "该手机号已注册，请直接登录"


class PasswordFormatError(BizError):
    code, http_status, default_message = 10002, 400, "密码至少 8 位"


class InviteCodeInvalidError(BizError):
    code, http_status, default_message = 10003, 400, "邀请码无效"


class InvalidCredentialsError(BizError):
    code, http_status, default_message = 10004, 401, "账号或密码错误"


class InvalidRefreshTokenError(BizError):
    code, http_status, default_message = 10005, 401, "refresh token 无效或已过期"


class TokenExpiredError(BizError):
    code, http_status, default_message = 10006, 401, "登录已过期，请重新登录"


class ForbiddenError(BizError):
    code, http_status, default_message = 10007, 403, "无权限"


# Profile / Chart 20xxx
class BirthDateOutOfRangeError(BizError):
    code, http_status, default_message = 20001, 400, "出生日期范围越界（1900-当年）"


class LeapMonthValidationError(BizError):
    code, http_status, default_message = 20002, 400, "闰月校验失败"


class TimeIndexOutOfRangeError(BizError):
    code, http_status, default_message = 20003, 400, "时辰索引越界（0-12）"


class ProfileNotFoundError(BizError):
    code, http_status, default_message = 20004, 404, "请先完善生辰信息"


class ChartEngineError(BizError):
    code, http_status, default_message = 20005, 500, "排盘引擎异常"


# Points 30xxx
class CheckinAlreadyDoneError(BizError):
    code, http_status, default_message = 30001, 400, "今日已签到"


class ShareRewardLimitError(BizError):
    code, http_status, default_message = 30002, 400, "今日分享奖励已达上限"


class AdRewardLimitError(BizError):
    code, http_status, default_message = 30003, 400, "今日广告奖励已达上限"


class AdTokenInvalidError(BizError):
    code, http_status, default_message = 30004, 400, "广告 token 无效"


class InsufficientPointsError(BizError):
    code, http_status, default_message = 30005, 400, "积分不足"


# Template 40xxx
class TemplateAlreadyUnlockedError(BizError):
    code, http_status, default_message = 40001, 400, "您已解锁该模板"


class TemplateInsufficientPointsError(BizError):
    code, http_status, default_message = 40002, 400, "积分不足以解锁该模板"


class TemplateNotFoundError(BizError):
    code, http_status, default_message = 40003, 404, "模板已下架或不存在"


class TemplateNameDuplicateError(BizError):
    code, http_status, default_message = 40004, 400, "模板名称已存在"


# Reading 50xxx
class TemplateNotUnlockedError(BizError):
    code, http_status, default_message = 50001, 403, "请先解锁该模板"


class AiServiceError(BizError):
    code, http_status, default_message = 50002, 500, "AI 服务异常，已退回积分"


class ReadingPointsInsufficientError(BizError):
    code, http_status, default_message = 50003, 400, "积分不足，无法解读"


class ChartDataMissingError(BizError):
    code, http_status, default_message = 50004, 400, "请先生成命盘"


class ReportNotFoundError(BizError):
    code, http_status, default_message = 50005, 404, "报告不存在"


# Share 60xxx
class ShareTokenInvalidError(BizError):
    code, http_status, default_message = 60001, 404, "分享链接无效或已过期"


# Admin 90xxx
class AdminUnauthorizedError(BizError):
    code, http_status, default_message = 90001, 401, "管理员未授权"


class AdminForbiddenError(BizError):
    code, http_status, default_message = 90002, 403, "管理员权限不足"
