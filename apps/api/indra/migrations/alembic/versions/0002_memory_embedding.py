"""add embedding column to memory_chunks

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-07

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "memory_chunks",
        sa.Column("embedding", Vector(1536), nullable=True),
    )
    # IVFFlat index for approximate nearest-neighbor cosine search.
    # lists=100 is a good default for up to ~1M rows.
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_memory_chunks_embedding "
        "ON memory_chunks USING ivfflat (embedding vector_cosine_ops) "
        "WITH (lists = 100)"
    )
    # Trigram index for text fallback search when no embedding is available.
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_memory_chunks_content_trgm "
        "ON memory_chunks USING gin (content gin_trgm_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_memory_chunks_content_trgm")
    op.execute("DROP INDEX IF EXISTS ix_memory_chunks_embedding")
    op.drop_column("memory_chunks", "embedding")
