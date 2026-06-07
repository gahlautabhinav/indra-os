"""
Naksatrani service — Knowledge Graph.
VASU domain: Infrastructure layer.

Naksatrani (नक्षत्राणि) = Stars — the map of relationships across the agentic universe.
"""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.core.exceptions import IndraException
from indra.models.knowledge import KnowledgeEdge, KnowledgeNode

from .schemas import EdgeCreate, EdgeRead, GraphResponse, NodeCreate, NodeRead

logger = structlog.get_logger()


class NaksatraniService:
    @staticmethod
    async def get_graph(db: AsyncSession) -> GraphResponse:
        nodes_result = await db.execute(select(KnowledgeNode).order_by(KnowledgeNode.created_at))
        edges_result = await db.execute(select(KnowledgeEdge).order_by(KnowledgeEdge.created_at))
        nodes = list(nodes_result.scalars().all())
        edges = list(edges_result.scalars().all())
        return GraphResponse(
            nodes=[NodeRead.model_validate(n, from_attributes=True) for n in nodes],
            edges=[EdgeRead.model_validate(e, from_attributes=True) for e in edges],
            node_count=len(nodes),
            edge_count=len(edges),
        )

    @staticmethod
    async def sync_agents(db: AsyncSession) -> int:
        from indra.models.agent import Agent

        agents_result = await db.execute(select(Agent))
        agents = list(agents_result.scalars().all())
        count = 0
        for agent in agents:
            existing = await db.execute(
                select(KnowledgeNode)
                .where(KnowledgeNode.entity_type == "agent")
                .where(KnowledgeNode.entity_id == str(agent.id))
            )
            if existing.scalar_one_or_none() is None:
                node = KnowledgeNode(
                    entity_type="agent",
                    entity_id=str(agent.id),
                    label=agent.name,
                    domain=agent.domain,
                    properties={"type": agent.type, "status": agent.status},
                )
                db.add(node)
                count += 1
        if count:
            await db.commit()
        logger.info("naksatrani.sync_agents", synced=count)
        return count

    @staticmethod
    async def create_node(db: AsyncSession, req: NodeCreate) -> NodeRead:
        node = KnowledgeNode(**req.model_dump())
        db.add(node)
        await db.commit()
        await db.refresh(node)
        return NodeRead.model_validate(node, from_attributes=True)

    @staticmethod
    async def create_edge(db: AsyncSession, req: EdgeCreate) -> EdgeRead:
        # Verify both nodes exist
        for node_id in (req.from_node_id, req.to_node_id):
            if await db.get(KnowledgeNode, node_id) is None:
                raise IndraException(
                    status_code=404,
                    error_code="node_not_found",
                    message=f"Node {node_id} not found",
                )
        edge = KnowledgeEdge(**req.model_dump())
        db.add(edge)
        await db.commit()
        await db.refresh(edge)
        return EdgeRead.model_validate(edge, from_attributes=True)

    @staticmethod
    async def search_nodes(db: AsyncSession, query: str, limit: int = 20) -> list[NodeRead]:
        result = await db.execute(
            select(KnowledgeNode)
            .where(KnowledgeNode.label.ilike(f"%{query}%"))
            .order_by(KnowledgeNode.created_at.desc())
            .limit(limit)
        )
        nodes = list(result.scalars().all())
        return [NodeRead.model_validate(n, from_attributes=True) for n in nodes]

    @staticmethod
    async def delete_node(db: AsyncSession, node_id: uuid.UUID) -> None:
        node = await db.get(KnowledgeNode, node_id)
        if node is None:
            raise IndraException(status_code=404, error_code="node_not_found", message="Node not found")
        await db.delete(node)
        await db.commit()

    @staticmethod
    async def delete_edge(db: AsyncSession, edge_id: uuid.UUID) -> None:
        edge = await db.get(KnowledgeEdge, edge_id)
        if edge is None:
            raise IndraException(status_code=404, error_code="edge_not_found", message="Edge not found")
        await db.delete(edge)
        await db.commit()
