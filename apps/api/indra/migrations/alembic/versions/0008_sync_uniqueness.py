"""enforce sync uniqueness — sessions.external_id + agents.session_id

Prevents the background poller / manual-sync race from accumulating duplicate
Session and Agent rows for the same CLI session. The service layer already
serializes syncs with an in-process lock and per-item savepoints; these DB-side
constraints are the durable guarantee (and protect multi-worker deployments).

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-07

"""
from collections.abc import Sequence

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Collapse any pre-existing duplicate agents (keep earliest per session).
    op.execute(
        """
        DELETE FROM agents a USING (
            SELECT session_id, min(created_at) AS keep_at
            FROM agents
            WHERE session_id IS NOT NULL
            GROUP BY session_id
            HAVING count(*) > 1
        ) d
        WHERE a.session_id = d.session_id AND a.created_at > d.keep_at
        """
    )

    # One agent per CLI session (partial — agents without a session are exempt).
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_agents_session_id "
        "ON agents (session_id) WHERE session_id IS NOT NULL"
    )

    # One session row per external CLI id.
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_sessions_external_id "
        "ON sessions (external_id) WHERE external_id IS NOT NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_sessions_external_id")
    op.execute("DROP INDEX IF EXISTS uq_agents_session_id")
