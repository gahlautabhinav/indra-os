"""
Naksatrani service — Knowledge Graph.
VASU domain: Infrastructure layer.

Naksatrani (नक्षत्राणि) = Stars — the map of relationships across the agentic universe.
"""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.core.exceptions import IndraException
from indra.models.knowledge import KnowledgeEdge, KnowledgeNode

from .schemas import EdgeCreate, EdgeRead, GraphResponse, NodeCreate, NodeRead

logger = structlog.get_logger()

# Node types / relationships the auto-rebuild owns (manual "custom" nodes and
# their edges are never touched).
_AUTO_TYPES = ("plugin", "project", "agent", "mcp_server")
_AUTO_RELS = ("runs_on", "worked_in", "spawned", "registered_with")

_PLUGIN_LABEL = {
    "claude_code": "Claude Code",
    "gemini_cli": "Gemini CLI",
    "codex_cli": "Codex CLI",
    "kiro_cli": "Kiro",
    "opencode": "OpenCode",
    "antigravity": "Antigravity",
}


def _project_leaf(path: str) -> str:
    leaf = path.replace("\\", "/").rstrip("/").split("/")[-1]
    return leaf or path


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
        """Backwards-compatible entry point — rebuilds the whole constellation."""
        return await NaksatraniService.rebuild_graph(db)

    @staticmethod
    async def rebuild_graph(db: AsyncSession) -> int:
        """
        Rebuild the multi-layer knowledge constellation from live data:
          plugin (CLI) ← agent (session) → project (cwd), with spawn lineage
          between agents and MCP servers attached to Claude Code.

        Auto-owned nodes/edges are wiped and recreated; manually-added "custom"
        nodes and their edges are preserved. Returns the node count.
        """
        from indra.models.agent import Agent
        from indra.models.mcp_server import MCPServer
        from indra.models.session import Session

        # Wipe only what this rebuild owns.
        await db.execute(delete(KnowledgeEdge).where(KnowledgeEdge.relationship.in_(_AUTO_RELS)))
        await db.execute(delete(KnowledgeNode).where(KnowledgeNode.entity_type.in_(_AUTO_TYPES)))
        await db.flush()

        rows = (
            await db.execute(
                select(Agent, Session.project_path).outerjoin(
                    Session, Agent.session_id == Session.id
                )
            )
        ).all()
        mcp_servers = list((await db.execute(select(MCPServer))).scalars())

        plugin_nodes: dict[str, KnowledgeNode] = {}
        project_nodes: dict[str, KnowledgeNode] = {}
        agent_nodes: dict[str, KnowledgeNode] = {}

        def plugin_node(pt: str) -> KnowledgeNode:
            if pt not in plugin_nodes:
                n = KnowledgeNode(
                    entity_type="plugin",
                    entity_id=pt,
                    label=_PLUGIN_LABEL.get(pt, pt),
                    domain="vasu",
                    properties={"kind": "cli"},
                )
                db.add(n)
                plugin_nodes[pt] = n
            return plugin_nodes[pt]

        def project_node(path: str) -> KnowledgeNode:
            if path not in project_nodes:
                n = KnowledgeNode(
                    entity_type="project",
                    entity_id=path,
                    label=_project_leaf(path),
                    domain="vasu",
                    properties={"path": path},
                )
                db.add(n)
                project_nodes[path] = n
            return project_nodes[path]

        # Pass 1 — create nodes.
        agent_meta: list[tuple[Agent, str | None]] = []
        for agent, project_path in rows:
            an = KnowledgeNode(
                entity_type="agent",
                entity_id=str(agent.id),
                label=agent.name,
                domain=agent.domain,
                properties={"plugin": agent.type, "status": agent.status},
            )
            db.add(an)
            agent_nodes[str(agent.id)] = an
            plugin_node(agent.type)
            if project_path:
                project_node(project_path)
            agent_meta.append((agent, project_path))

        for srv in mcp_servers:
            db.add(
                KnowledgeNode(
                    entity_type="mcp_server",
                    entity_id=str(srv.id),
                    label=srv.name,
                    domain="vasu",
                    properties={"status": srv.status, "transport": srv.transport},
                )
            )

        await db.flush()  # assign node ids

        # Pass 2 — edges.
        for agent, project_path in agent_meta:
            an = agent_nodes[str(agent.id)]
            db.add(KnowledgeEdge(from_node_id=an.id, to_node_id=plugin_nodes[agent.type].id, relationship="runs_on"))
            if project_path and project_path in project_nodes:
                db.add(KnowledgeEdge(from_node_id=an.id, to_node_id=project_nodes[project_path].id, relationship="worked_in"))
            if agent.parent_id and str(agent.parent_id) in agent_nodes:
                db.add(
                    KnowledgeEdge(
                        from_node_id=agent_nodes[str(agent.parent_id)].id,
                        to_node_id=an.id,
                        relationship="spawned",
                    )
                )

        # MCP servers attach to Claude Code (where they're registered).
        claude = plugin_nodes.get("claude_code")
        if claude is not None:
            mcp_node_rows = list(
                (
                    await db.execute(
                        select(KnowledgeNode).where(KnowledgeNode.entity_type == "mcp_server")
                    )
                ).scalars()
            )
            for mn in mcp_node_rows:
                db.add(KnowledgeEdge(from_node_id=mn.id, to_node_id=claude.id, relationship="registered_with"))

        await db.commit()
        total = len(agent_nodes) + len(plugin_nodes) + len(project_nodes) + len(mcp_servers)
        logger.info(
            "naksatrani.rebuild_graph",
            agents=len(agent_nodes),
            projects=len(project_nodes),
            plugins=len(plugin_nodes),
            mcp=len(mcp_servers),
        )
        return total

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
