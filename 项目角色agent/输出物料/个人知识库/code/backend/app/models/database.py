"""
SQLAlchemy ORM 模型定义 — 对应 tech-architecture.md 第 5 章全部数据表
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, BigInteger, Boolean, Float,
    ForeignKey, DateTime, JSON, UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship
from pgvector.sqlalchemy import Vector


class Base(DeclarativeBase):
    pass


# ============================================================
# 用户相关
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100))
    email = Column(String(255), unique=True, nullable=False, index=True)
    email_verified = Column(DateTime(timezone=True))
    password_hash = Column(String(255))  # 邮箱注册用户
    image = Column(Text)  # 头像 URL
    plan = Column(String(20), default="free")  # free | pro | enterprise
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    oauth_accounts = relationship("OAuthAccount", back_populates="user", cascade="all, delete-orphan")
    spaces = relationship("Space", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")


class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)  # wechat | google | github
    provider_account_id = Column(String(255), nullable=False)
    access_token = Column(Text)
    refresh_token = Column(Text)
    expires_at = Column(Integer)
    token_type = Column(String(50))
    scope = Column(Text)

    user = relationship("User", back_populates="oauth_accounts")

    __table_args__ = (
        UniqueConstraint("provider", "provider_account_id", name="uq_oauth_provider_account"),
    )


# ============================================================
# 知识空间
# ============================================================

class Space(Base):
    __tablename__ = "spaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="spaces")
    documents = relationship("Document", back_populates="space", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="space")


# ============================================================
# 文档（知识条目）
# ============================================================

class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    file_name = Column(String(500))
    file_type = Column(String(20), nullable=False)  # pdf | word | web | markdown | txt
    file_size = Column(BigInteger)  # 字节数
    file_key = Column(String(500))  # 存储路径
    original_url = Column(Text)  # 网页来源 URL
    summary = Column(Text)  # AI 生成摘要
    page_count = Column(Integer)
    status = Column(String(20), default="processing")  # processing | ready | failed
    error_message = Column(Text)
    parsed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="documents")
    space = relationship("Space", back_populates="documents")
    chunks = relationship("DocChunk", back_populates="document", cascade="all, delete-orphan")
    tags = relationship("DocumentTag", back_populates="document", cascade="all, delete-orphan")
    task_statuses = relationship("TaskStatus", back_populates="document", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_documents_user_space", "user_id", "space_id"),
        Index("idx_documents_user_status", "user_id", "status"),
        Index("idx_documents_user_created", "user_id", "created_at"),
    )


# ============================================================
# 文档分块 + 向量索引
# ============================================================

class DocChunk(Base):
    __tablename__ = "doc_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)  # 块序号
    heading = Column(Text)  # 所属标题
    content = Column(Text, nullable=False)  # 文本内容
    page_num = Column(Integer)  # PDF 页码
    embedding = Column(Vector(1024))  # BGE-M3 向量（1024维）
    metadata_ = Column("metadata", JSON, default={})
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    document = relationship("Document", back_populates="chunks")

    __table_args__ = (
        Index("idx_chunks_document", "document_id"),
        Index("idx_chunks_user", "user_id"),
    )


# ============================================================
# 标签
# ============================================================

class DocumentTag(Base):
    __tablename__ = "document_tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(50), nullable=False)
    is_ai = Column(Boolean, default=True)  # AI 生成 vs 用户自定义
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    document = relationship("Document", back_populates="tags")

    __table_args__ = (
        UniqueConstraint("document_id", "label", name="uq_document_tag"),
        Index("idx_tags_document", "document_id"),
        Index("idx_tags_label", "label"),
    )


# ============================================================
# 对话
# ============================================================

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(200))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="conversations")
    space = relationship("Space", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_conversations_user", "user_id", "updated_at"),
    )


# ============================================================
# 消息
# ============================================================

class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    token_usage = Column(JSON)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")
    citations = relationship("Citation", back_populates="message", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="message", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_messages_conversation", "conversation_id", "created_at"),
    )


# ============================================================
# 引用来源
# ============================================================

class Citation(Base):
    __tablename__ = "citations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    citation_index = Column(Integer, nullable=False)  # 引用编号 [1] [2]
    chunk_id = Column(UUID(as_uuid=True), ForeignKey("doc_chunks.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    excerpt = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False)  # 0-1
    page_num = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    message = relationship("Message", back_populates="citations")
    chunk = relationship("DocChunk")
    document = relationship("Document")

    __table_args__ = (
        Index("idx_citations_message", "message_id"),
    )


# ============================================================
# 反馈
# ============================================================

class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(20), nullable=False)  # helpful | not_helpful
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    message = relationship("Message", back_populates="feedbacks")
    user = relationship("User", back_populates="feedbacks")

    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_feedback_message_user"),
    )


# ============================================================
# 异步任务追踪
# ============================================================

class TaskStatus(Base):
    __tablename__ = "task_status"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    task_type = Column(String(50), nullable=False)  # parse | embed | tag | summarize
    status = Column(String(20), default="pending")  # pending | running | completed | failed
    progress = Column(Integer, default=0)  # 0-100
    error = Column(Text)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    document = relationship("Document", back_populates="task_statuses")

    __table_args__ = (
        Index("idx_task_document", "document_id"),
    )
