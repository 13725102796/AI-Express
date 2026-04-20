"""init schema: 10 tables

Revision ID: 0001_init_schema
Revises:
Create Date: 2026-04-17

10 张表：users / user_profiles / chart_data / points_transactions /
checkin_records / prompt_templates / user_templates / reading_reports /
points_configs / admins

方言无关：使用 sa.Uuid / sa.JSON，PostgreSQL 和 MySQL 5.7+ 均可运行。
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_init_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ──────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("phone_encrypted", sa.String(256), nullable=False),
        sa.Column("phone_hash", sa.String(64), nullable=False),
        sa.Column("password_hash", sa.String(128), nullable=False),
        sa.Column("nickname", sa.String(32)),
        sa.Column("avatar_url", sa.String(256)),
        sa.Column("points_balance", sa.Integer, nullable=False, server_default="0"),
        sa.Column("invite_code", sa.String(8), nullable=False),
        sa.Column("invited_by", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("free_reading_used", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("points_balance >= 0", name="chk_points_balance_non_negative"),
        sa.UniqueConstraint("phone_hash", name="uq_users_phone_hash"),
        sa.UniqueConstraint("invite_code", name="uq_users_invite_code"),
    )
    op.create_index("ix_users_phone_hash", "users", ["phone_hash"])
    op.create_index("ix_users_invite_code", "users", ["invite_code"])
    op.create_index("ix_users_invited_by", "users", ["invited_by"])

    # ── user_profiles ──────────────────────────────
    op.create_table(
        "user_profiles",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.Uuid(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("birth_type", sa.String(8), nullable=False),
        sa.Column("birth_year", sa.Integer, nullable=False),
        sa.Column("birth_month", sa.Integer, nullable=False),
        sa.Column("birth_day", sa.Integer, nullable=False),
        sa.Column("birth_time_index", sa.Integer, nullable=False),
        sa.Column("gender", sa.String(8), nullable=False),
        sa.Column("is_leap_month", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("birth_place_province", sa.String(32)),
        sa.Column("birth_place_city", sa.String(32)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", name="uq_user_profiles_user_id"),
    )
    op.create_index("ix_user_profiles_user_id", "user_profiles", ["user_id"])

    # ── chart_data ─────────────────────────────────
    op.create_table(
        "chart_data",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.Uuid(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("profile_id", sa.Uuid(as_uuid=True),
                  sa.ForeignKey("user_profiles.id"), nullable=False),
        sa.Column("chart_json", sa.JSON, nullable=False),
        sa.Column("chart_text", sa.Text, nullable=False),
        sa.Column("api_params", sa.JSON, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", name="uq_chart_data_user_id"),
    )
    op.create_index("ix_chart_data_user_id", "chart_data", ["user_id"])

    # ── points_transactions ────────────────────────
    # 注意：MySQL 5.7 不支持索引列方向，改用普通升序；查询时 ORDER BY 仍可用 DESC
    op.create_table(
        "points_transactions",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(32), nullable=False),
        sa.Column("amount", sa.Integer, nullable=False),
        sa.Column("balance_after", sa.Integer, nullable=False),
        sa.Column("reference_id", sa.Uuid(as_uuid=True)),
        sa.Column("description", sa.String(200)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_points_tx_user_created", "points_transactions", ["user_id", "created_at"])

    # ── checkin_records ────────────────────────────
    op.create_table(
        "checkin_records",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("checkin_date", sa.Date, nullable=False),
        sa.Column("consecutive_days", sa.Integer, nullable=False),
        sa.Column("points_earned", sa.Integer, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "checkin_date", name="uniq_checkin_user_date"),
    )
    op.create_index("ix_checkin_records_user_id", "checkin_records", ["user_id"])

    # ── prompt_templates ───────────────────────────
    op.create_table(
        "prompt_templates",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("description", sa.String(200), nullable=False),
        sa.Column("detail", sa.Text, nullable=False),
        sa.Column("prompt_content", sa.Text, nullable=False),
        # MySQL JSON 不支持带默认值（5.7 限制），用 Python 层 default=list 由 ORM 处理
        sa.Column("tags", sa.JSON, nullable=False),
        sa.Column("points_cost", sa.Integer, nullable=False, server_default="0"),
        sa.Column("preview_image_url", sa.String(256)),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("unlock_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("name", name="uq_prompt_templates_name"),
    )
    op.create_index("ix_prompt_templates_name", "prompt_templates", ["name"])

    # ── user_templates ─────────────────────────────
    op.create_table(
        "user_templates",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("template_id", sa.Uuid(as_uuid=True),
                  sa.ForeignKey("prompt_templates.id"), nullable=False),
        sa.Column("points_spent", sa.Integer, nullable=False),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "template_id", name="uniq_user_template"),
    )
    op.create_index("ix_user_templates_user_id", "user_templates", ["user_id"])

    # ── reading_reports ────────────────────────────
    # MySQL 的 UNIQUE 索引对 NULL 视为不同值，等价于 PG 的 partial index
    op.create_table(
        "reading_reports",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("template_id", sa.Uuid(as_uuid=True),
                  sa.ForeignKey("prompt_templates.id"), nullable=False),
        sa.Column("chart_id", sa.Uuid(as_uuid=True),
                  sa.ForeignKey("chart_data.id"), nullable=False),
        sa.Column("prompt_snapshot", sa.Text, nullable=False),
        sa.Column("ai_response", sa.Text, nullable=False),
        sa.Column("model_name", sa.String(64), nullable=False),
        sa.Column("token_usage", sa.JSON),
        sa.Column("points_spent", sa.Integer, nullable=False),
        sa.Column("share_token", sa.String(32)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_reports_user_created", "reading_reports", ["user_id", "created_at"])
    op.create_index("uniq_share_token", "reading_reports", ["share_token"], unique=True)

    # ── points_configs ─────────────────────────────
    op.create_table(
        "points_configs",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("key", sa.String(64), nullable=False),
        sa.Column("value", sa.Integer, nullable=False),
        sa.Column("description", sa.String(200)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("key", name="uq_points_configs_key"),
    )
    op.create_index("ix_points_configs_key", "points_configs", ["key"])

    # ── admins ─────────────────────────────────────
    op.create_table(
        "admins",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("username", sa.String(32), nullable=False),
        sa.Column("password_hash", sa.String(128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("username", name="uq_admins_username"),
    )
    op.create_index("ix_admins_username", "admins", ["username"])


def downgrade() -> None:
    op.drop_table("admins")
    op.drop_table("points_configs")
    op.drop_index("uniq_share_token", table_name="reading_reports")
    op.drop_index("idx_reports_user_created", table_name="reading_reports")
    op.drop_table("reading_reports")
    op.drop_table("user_templates")
    op.drop_table("prompt_templates")
    op.drop_table("checkin_records")
    op.drop_index("idx_points_tx_user_created", table_name="points_transactions")
    op.drop_table("points_transactions")
    op.drop_table("chart_data")
    op.drop_table("user_profiles")
    op.drop_table("users")
