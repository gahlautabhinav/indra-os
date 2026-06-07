from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from indra.database import Base
from indra.models.base import UUIDMixin


class Session(Base, UUIDMixin):
    __tablename__ = "sessions"

    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    plugin_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    project_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active", index=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )

    agents: Mapped[list["Agent"]] = relationship("Agent", back_populates="session")  # type: ignore[name-defined]
    traces: Mapped[list["Trace"]] = relationship("Trace", back_populates="session")  # type: ignore[name-defined]
