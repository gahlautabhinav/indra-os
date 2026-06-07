"""
Varunah service — Policy Engine & Guardrails.
ADITYA domain: Governance layer.

Varuna (वरुण) = the cosmic order keeper — enforces truth and limits.
"""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.core.exceptions import IndraException
from indra.models.policy import Policy

from .schemas import PolicyCheckResult, PolicyCreate, PolicyRead, PolicyUpdate

logger = structlog.get_logger()

_VALID_TYPES = frozenset({"cost_limit", "token_limit", "tool_block", "rate_limit"})
_VALID_TARGETS = frozenset({"global", "agent", "session", "domain"})


class VarunahService:
    @staticmethod
    async def list_policies(
        db: AsyncSession, policy_type: str | None = None, enabled_only: bool = False
    ) -> list[PolicyRead]:
        stmt = select(Policy).order_by(Policy.created_at.desc())
        if policy_type:
            stmt = stmt.where(Policy.policy_type == policy_type)
        if enabled_only:
            stmt = stmt.where(Policy.enabled == True)  # noqa: E712
        result = await db.execute(stmt)
        return [PolicyRead.model_validate(p, from_attributes=True) for p in result.scalars()]

    @staticmethod
    async def create_policy(db: AsyncSession, req: PolicyCreate) -> PolicyRead:
        if req.policy_type not in _VALID_TYPES:
            raise IndraException(
                status_code=400,
                error_code="invalid_policy_type",
                message=f"policy_type must be one of: {', '.join(sorted(_VALID_TYPES))}",
            )
        if req.target_type not in _VALID_TARGETS:
            raise IndraException(
                status_code=400,
                error_code="invalid_target_type",
                message=f"target_type must be one of: {', '.join(sorted(_VALID_TARGETS))}",
            )
        policy = Policy(**req.model_dump())
        db.add(policy)
        await db.commit()
        await db.refresh(policy)
        logger.info("varunah.policy_created", id=str(policy.id), type=policy.policy_type)
        return PolicyRead.model_validate(policy, from_attributes=True)

    @staticmethod
    async def update_policy(db: AsyncSession, policy_id: uuid.UUID, req: PolicyUpdate) -> PolicyRead:
        policy = await db.get(Policy, policy_id)
        if policy is None:
            raise IndraException(status_code=404, error_code="policy_not_found", message="Policy not found")
        for field, value in req.model_dump(exclude_none=True).items():
            setattr(policy, field, value)
        await db.commit()
        await db.refresh(policy)
        return PolicyRead.model_validate(policy, from_attributes=True)

    @staticmethod
    async def delete_policy(db: AsyncSession, policy_id: uuid.UUID) -> None:
        policy = await db.get(Policy, policy_id)
        if policy is None:
            raise IndraException(status_code=404, error_code="policy_not_found", message="Policy not found")
        await db.delete(policy)
        await db.commit()

    @staticmethod
    async def check(
        db: AsyncSession,
        cost_usd: float = 0.0,
        token_count: int = 0,
        agent_id: str | None = None,
        domain: str | None = None,
    ) -> PolicyCheckResult:
        """Check whether an operation violates any active policies."""
        result = await db.execute(
            select(Policy).where(Policy.enabled == True)  # noqa: E712
        )
        policies = list(result.scalars())
        violated: list[str] = []

        for p in policies:
            # Skip policies targeting a different entity
            if p.target_type == "agent" and p.target_id != agent_id:
                continue
            if p.target_type == "domain" and p.target_id != domain:
                continue

            if p.policy_type == "cost_limit":
                limit = float(p.config.get("max_usd", 0))
                if limit > 0 and cost_usd > limit:
                    violated.append(f"{p.name} (cost_limit: ${limit})")

            elif p.policy_type == "token_limit":
                limit = int(p.config.get("max_tokens", 0))
                if limit > 0 and token_count > limit:
                    violated.append(f"{p.name} (token_limit: {limit})")

        allowed = len(violated) == 0
        return PolicyCheckResult(
            allowed=allowed,
            violated_policies=violated,
            message="OK" if allowed else f"Blocked by {len(violated)} policy/policies",
        )
