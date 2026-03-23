"""
Pydantic v2 Schema 定义 — 请求/响应数据校验
"""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr, HttpUrl, ConfigDict


# ============================================================
# 通用
# ============================================================

class ErrorResponse(BaseModel):
    error: str
    message: str


class SuccessResponse(BaseModel):
    success: bool = True


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)


# ============================================================
# M1: 认证
# ============================================================

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: Optional[str] = Field(default=None, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: Optional[str]
    email: str
    image: Optional[str]
    plan: str
    created_at: datetime


class UpdateUserRequest(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


# ============================================================
# M2: 文件上传与解析
# ============================================================

class DocumentUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    file_name: Optional[str]
    file_type: str
    file_size: Optional[int]
    status: str
    space_id: uuid.UUID
    created_at: datetime


class DocumentURLRequest(BaseModel):
    url: HttpUrl
    space_id: Optional[uuid.UUID] = None


class DocumentURLResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    file_type: str
    original_url: Optional[str]
    status: str
    space_id: uuid.UUID
    created_at: datetime


# ============================================================
# M3: AI 问答与搜索
# ============================================================

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=10000)
    conversation_id: Optional[uuid.UUID] = None
    space_id: Optional[uuid.UUID] = None


class ChatFeedbackRequest(BaseModel):
    message_id: uuid.UUID
    conversation_id: uuid.UUID
    type: str = Field(pattern="^(helpful|not_helpful)$")


class CitationItem(BaseModel):
    index: int
    source_id: uuid.UUID
    source_title: str
    source_type: str
    excerpt: str
    confidence: float
    page_num: Optional[int] = None


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: str
    content: str
    created_at: datetime
    citations: list[CitationItem] = []
    feedback: Optional[str] = None


class ConversationListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: Optional[str]
    last_message_at: Optional[datetime] = None
    message_count: int = 0
    space_id: Optional[uuid.UUID]


class ConversationDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: Optional[str]
    space_id: Optional[uuid.UUID]
    messages: list[MessageResponse] = []


class SearchRequest(BaseModel):
    q: str = Field(min_length=1, max_length=1000)
    space_id: Optional[uuid.UUID] = None
    file_type: Optional[str] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)


class SearchResultItem(BaseModel):
    id: uuid.UUID
    title: str
    file_type: str
    matched_paragraph: str
    relevance_score: float
    space_name: Optional[str]
    created_at: datetime


class SearchResponse(BaseModel):
    query: str
    total: int
    time_cost: str
    results: list[SearchResultItem]
    has_more: bool
    search_mode: str = "semantic"  # "semantic" or "keyword"


# ============================================================
# M4: 知识库管理
# ============================================================

class TagItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    label: str
    is_ai: bool


class DocumentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    file_type: str
    file_size: Optional[int]
    summary: Optional[str]
    tags: list[TagItem] = []
    space_name: Optional[str] = None
    status: str
    created_at: datetime


class DocumentListResponse(BaseModel):
    items: list[DocumentListItem]
    total: int
    page: int
    limit: int
    has_more: bool


class ChunkContent(BaseModel):
    paragraph_id: str
    heading: Optional[str]
    content: str


class DocumentDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    file_name: Optional[str]
    file_type: str
    file_size: Optional[int]
    page_count: Optional[int]
    original_url: Optional[str]
    space_id: uuid.UUID
    space_name: Optional[str] = None
    tags: list[TagItem] = []
    extracted_content: list[ChunkContent] = []
    summary: Optional[str]
    status: str
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime


class UpdateTagsRequest(BaseModel):
    add_tags: list[str] = Field(default_factory=list)
    remove_tags: list[str] = Field(default_factory=list)


class BatchDeleteRequest(BaseModel):
    ids: list[uuid.UUID] = Field(min_length=1, max_length=100)


class MoveDocumentRequest(BaseModel):
    space_id: uuid.UUID


class RelatedDocumentItem(BaseModel):
    id: uuid.UUID
    title: str
    file_type: str
    relevance_score: float


# ============================================================
# M5: 知识空间与设置
# ============================================================

class CreateSpaceRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None


class UpdateSpaceRequest(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = None


class SpaceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: Optional[str]
    doc_count: int = 0
    total_size_mb: float = 0.0
    created_at: datetime
    updated_at: datetime


class SpaceListResponse(BaseModel):
    items: list[SpaceResponse]
    quota: dict


class SpaceStatsResponse(BaseModel):
    doc_count: int
    total_size_mb: float
    file_type_distribution: dict[str, int] = {}


class UsageResponse(BaseModel):
    documents: dict
    storage: dict
    ai_queries: dict
    spaces: dict


class ExportResponse(BaseModel):
    export_id: str
    status: str
    estimated_time: Optional[str] = None
    download_url: Optional[str] = None


# ============================================================
# 忘记/重置密码
# ============================================================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


# ============================================================
# 搜索建议
# ============================================================

class SearchSuggestionItem(BaseModel):
    text: str
    type: str  # "query" | "document"


class SearchSuggestResponse(BaseModel):
    suggestions: list[SearchSuggestionItem]


# ============================================================
# 停止生成
# ============================================================

class StopGenerationRequest(BaseModel):
    message_id: Optional[uuid.UUID] = None


# ============================================================
# 文档分块列表
# ============================================================

class DocChunkItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chunk_index: int
    heading: Optional[str]
    content: str
    token_count: Optional[int] = None
    has_embedding: bool = False


class DocChunkListResponse(BaseModel):
    items: list[DocChunkItem]
    total: int


# ============================================================
# 批量移动
# ============================================================

class BatchMoveRequest(BaseModel):
    ids: list[uuid.UUID] = Field(min_length=1, max_length=100)
    space_id: uuid.UUID


# ============================================================
# 第三方绑定
# ============================================================

class OAuthBindingItem(BaseModel):
    provider: str
    bound: bool
    name: Optional[str] = None
    bound_at: Optional[datetime] = None


class OAuthBindingsResponse(BaseModel):
    bindings: list[OAuthBindingItem]


class BindProviderRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None
