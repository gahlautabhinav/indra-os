"""
Naksatrani router — Knowledge Graph endpoints.
VASU domain: Infrastructure layer.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db

from .schemas import EdgeCreate, EdgeRead, GraphResponse, NodeCreate, NodeRead, SearchRequest
from .service import NaksatraniService

router = APIRouter()


@router.get("/knowledge/graph", response_model=GraphResponse, tags=["knowledge"])
async def get_graph(db: AsyncSession = Depends(get_db)) -> GraphResponse:
    return await NaksatraniService.get_graph(db)


@router.post("/knowledge/sync", tags=["knowledge"])
async def sync_agents(db: AsyncSession = Depends(get_db)) -> dict[str, int]:
    count = await NaksatraniService.sync_agents(db)
    return {"synced": count}


@router.post("/knowledge/nodes", response_model=NodeRead, status_code=status.HTTP_201_CREATED, tags=["knowledge"])
async def create_node(body: NodeCreate, db: AsyncSession = Depends(get_db)) -> NodeRead:
    return await NaksatraniService.create_node(db, body)


@router.post("/knowledge/edges", response_model=EdgeRead, status_code=status.HTTP_201_CREATED, tags=["knowledge"])
async def create_edge(body: EdgeCreate, db: AsyncSession = Depends(get_db)) -> EdgeRead:
    return await NaksatraniService.create_edge(db, body)


@router.post("/knowledge/search", response_model=list[NodeRead], tags=["knowledge"])
async def search_nodes(body: SearchRequest, db: AsyncSession = Depends(get_db)) -> list[NodeRead]:
    return await NaksatraniService.search_nodes(db, body.query, body.limit)


@router.delete("/knowledge/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["knowledge"])
async def delete_node(node_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> None:
    await NaksatraniService.delete_node(db, node_id)


@router.delete("/knowledge/edges/{edge_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["knowledge"])
async def delete_edge(edge_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> None:
    await NaksatraniService.delete_edge(db, edge_id)
