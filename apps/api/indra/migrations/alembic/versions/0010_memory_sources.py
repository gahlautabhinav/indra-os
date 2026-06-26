"""project-scoped memory sources — incremental Smriti ingestion

Adds project_id / source_type / source_id / content_hash to memory_chunks so the
Tvasta index pipeline can ingest each project's knowledge (graph symbols, communities,
vault notes) into Smriti and upsert it incrementally by content hash. A partial unique
index keys an ingested chunk by (project_id, source_type, source_id); manual chunks
(null project_id) are unaffected.

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-26

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "memory_chunks",
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.add_column("memory_chunks", sa.Column("source_type", sa.String(40), nullable=True))
    op.add_column("memory_chunks", sa.Column("source_id", sa.String(512), nullable=True))
    op.add_column("memory_chunks", sa.Column("content_hash", sa.String(64), nullable=True))
    op.create_index("ix_memory_chunks_project_id", "memory_chunks", ["project_id"])
    op.create_index("ix_memory_chunks_source_type", "memory_chunks", ["source_type"])
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_memory_chunks_source "
        "ON memory_chunks (project_id, source_type, source_id) "
        "WHERE project_id IS NOT NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_memory_chunks_source")
    op.drop_index("ix_memory_chunks_source_type", table_name="memory_chunks")
    op.drop_index("ix_memory_chunks_project_id", table_name="memory_chunks")
    op.drop_column("memory_chunks", "content_hash")
    op.drop_column("memory_chunks", "source_id")
    op.drop_column("memory_chunks", "source_type")
    op.drop_column("memory_chunks", "project_id")
