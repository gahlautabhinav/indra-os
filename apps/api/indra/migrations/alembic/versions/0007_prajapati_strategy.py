"""Prajapati strategy layer — goals table

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-07
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "goals",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("target_outcome", sa.Text, nullable=False),
        sa.Column("priority", sa.Integer, nullable=False, server_default="1"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("definition", JSONB, nullable=False, server_default="{}"),
        sa.Column("progress_pct", sa.Integer, nullable=False, server_default="0"),
        sa.Column("agent_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_goals_status", "goals", ["status"])
    op.create_index("ix_goals_priority", "goals", ["priority"])
    op.create_index("ix_goals_created_at", "goals", ["created_at"])


def downgrade() -> None:
    op.drop_table("goals")
