"""add vasu infrastructure tables (workspaces, knowledge graph)

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-07

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── workspaces ──────────────────────────────────────────────────────────
    op.create_table(
        "workspaces",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("path", sa.Text, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("file_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("size_bytes", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("last_indexed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("path", name="uq_workspaces_path"),
    )
    op.create_index("ix_workspaces_status", "workspaces", ["status"])
    op.create_index("ix_workspaces_created_at", "workspaces", ["created_at"])

    # ── knowledge_nodes ──────────────────────────────────────────────────────
    op.create_table(
        "knowledge_nodes",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.String(255), nullable=True),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("domain", sa.String(50), nullable=False, server_default="vasu"),
        sa.Column("properties", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_knowledge_nodes_entity_type", "knowledge_nodes", ["entity_type"])
    op.create_index("ix_knowledge_nodes_entity_id", "knowledge_nodes", ["entity_id"])
    op.create_index("ix_knowledge_nodes_created_at", "knowledge_nodes", ["created_at"])

    # ── knowledge_edges ──────────────────────────────────────────────────────
    op.create_table(
        "knowledge_edges",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "from_node_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge_nodes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "to_node_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge_nodes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("relationship", sa.String(100), nullable=False),
        sa.Column("weight", sa.Float, nullable=False, server_default="1.0"),
        sa.Column("properties", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_knowledge_edges_from_node_id", "knowledge_edges", ["from_node_id"])
    op.create_index("ix_knowledge_edges_to_node_id", "knowledge_edges", ["to_node_id"])


def downgrade() -> None:
    op.drop_table("knowledge_edges")
    op.drop_index("ix_knowledge_nodes_created_at", table_name="knowledge_nodes")
    op.drop_index("ix_knowledge_nodes_entity_id", table_name="knowledge_nodes")
    op.drop_index("ix_knowledge_nodes_entity_type", table_name="knowledge_nodes")
    op.drop_table("knowledge_nodes")
    op.drop_index("ix_workspaces_created_at", table_name="workspaces")
    op.drop_index("ix_workspaces_status", table_name="workspaces")
    op.drop_table("workspaces")
