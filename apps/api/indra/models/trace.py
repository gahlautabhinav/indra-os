import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from indra.database import Base
from indra.models.base import UUIDMixin


class Trace(Base, UUIDMixin):
    __tablename__ = "traces"

    trace_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True
    )
    root_span_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    attributes: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )

    session: Mapped["Session | None"] = relationship("Session", back_populates="traces")  # type: ignore[name-defined]
    spans: Mapped[list["Span"]] = relationship("Span", back_populates="trace", cascade="all, delete-orphan")


class Span(Base, UUIDMixin):
    __tablename__ = "spans"

    span_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    trace_id: Mapped[str] = mapped_column(
        String(255), ForeignKey("traces.trace_id", ondelete="CASCADE"), nullable=False, index=True
    )
    parent_span_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    kind: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    attributes: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    events: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    trace: Mapped["Trace"] = relationship("Trace", back_populates="spans")
