from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class NodeCreate(BaseModel):
    entity_type: str
    entity_id: str | None = None
    label: str
    domain: str = "vasu"
    properties: dict[str, Any] = {}


class NodeRead(BaseModel):
    id: uuid.UUID
    entity_type: str
    entity_id: str | None
    label: str
    domain: str
    properties: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class EdgeCreate(BaseModel):
    from_node_id: uuid.UUID
    to_node_id: uuid.UUID
    relationship: str
    weight: float = 1.0
    properties: dict[str, Any] = {}


class EdgeRead(BaseModel):
    id: uuid.UUID
    from_node_id: uuid.UUID
    to_node_id: uuid.UUID
    relationship: str
    weight: float
    properties: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class GraphResponse(BaseModel):
    nodes: list[NodeRead]
    edges: list[EdgeRead]
    node_count: int
    edge_count: int


class SearchRequest(BaseModel):
    query: str
    limit: int = 20
