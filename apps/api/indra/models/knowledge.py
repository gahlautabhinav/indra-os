"""
Knowledge graph models — Naksatrani domain.
VASU domain: Infrastructure layer.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from indra.database import Base


class KnowledgeNode(Base):
    __tablename__ = "knowledge_nodes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str] = mapped_column(String(50), nullable=False, default="vasu")
    properties: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )


class KnowledgeEdge(Base):
    __tablename__ = "knowledge_edges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_nodes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    to_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_nodes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    relationship: Mapped[str] = mapped_column(String(100), nullable=False)
    weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    properties: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
