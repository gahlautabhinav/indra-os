"""local embeddings — free semantic search (model2vec, 256-dim)

Adds memory_chunks.embedding_local (pgvector, 256) populated by a local model2vec
model during ingestion, so the second brain has real semantic search with no API
cost. The existing 1536-dim OpenAI `embedding` column is untouched.

Revision ID: 0011
Revises: 0010
Create Date: 2026-06-26

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("memory_chunks", sa.Column("embedding_local", Vector(256), nullable=True))


def downgrade() -> None:
    op.drop_column("memory_chunks", "embedding_local")
