"""通用响应包装 + 分页."""
from __future__ import annotations

from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    code: int = 0
    data: Optional[T] = None
    message: str = "success"

    model_config = ConfigDict(arbitrary_types_allowed=True)


class Paginated(BaseModel, Generic[T]):
    items: List[T] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 20


def ok(data: T = None, message: str = "success") -> ApiResponse[T]:
    return ApiResponse(code=0, data=data, message=message)


def fail(code: int, message: str) -> ApiResponse:
    return ApiResponse(code=code, data=None, message=message)
