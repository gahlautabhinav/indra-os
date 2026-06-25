"""
Project model — a tracked project root that INDRA can auto-index.

Owned by Prthivi (storage); orchestrated by Tvasta. Opt-in: a project is only
auto-indexed once `enabled` is set. Holds per-project index state so the pipeline
is incremental and resumable.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from indra.database import Base
from indra.models.base import TimestampMixin, UUIDMixin


class Project(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "projects"

    # Canonical project root (forward-slash normalized, original case).
    root_path: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Opt-in: only enabled projects are auto-indexed.
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    # <root>/graphify-out if it exists.
    graphify_out: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Whether a build_vault.py exists (else the vault stage needs a one-time bootstrap).
    has_vault_builder: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # idle | running | ok | failed
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="idle", index=True)
    last_fingerprint: Mapped[str | None] = mapped_column(Text, nullable=True)
    index_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_indexed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Per-stage status of the most recent run.
    stages: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
