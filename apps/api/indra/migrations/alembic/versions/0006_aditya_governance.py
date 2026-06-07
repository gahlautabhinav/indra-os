"""add aditya governance tables (policies, schedules)

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-07

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── policies ─────────────────────────────────────────────────────────────
    op.create_table(
        "policies",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("policy_type", sa.String(50), nullable=False),
        sa.Column("target_type", sa.String(50), nullable=False, server_default="global"),
        sa.Column("target_id", sa.String(255), nullable=True),
        sa.Column("config", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_policies_policy_type", "policies", ["policy_type"])
    op.create_index("ix_policies_enabled", "policies", ["enabled"])
    op.create_index("ix_policies_created_at", "policies", ["created_at"])

    # ── schedules ─────────────────────────────────────────────────────────────
    op.create_table(
        "schedules",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("trigger_type", sa.String(20), nullable=False),
        sa.Column("trigger_config", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("action_type", sa.String(50), nullable=False),
        sa.Column("action_config", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_schedules_enabled", "schedules", ["enabled"])


def downgrade() -> None:
    op.drop_index("ix_schedules_enabled", table_name="schedules")
    op.drop_table("schedules")
    op.drop_index("ix_policies_created_at", table_name="policies")
    op.drop_index("ix_policies_enabled", table_name="policies")
    op.drop_index("ix_policies_policy_type", table_name="policies")
    op.drop_table("policies")
