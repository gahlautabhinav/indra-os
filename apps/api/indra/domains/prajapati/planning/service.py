"""
Planning service — Strategy plan templates and generation.
PRAJAPATI domain: Strategy layer.
"""

from __future__ import annotations

from .schemas import GeneratePlanRequest, GeneratePlanResponse, PlanTemplate

_TEMPLATES: list[PlanTemplate] = [
    PlanTemplate(
        id="research_and_summarize",
        name="Research & Summarize",
        category="research",
        description="Gather information on a topic, synthesize findings, and produce a summary report.",
        steps=[
            {"id": "s1", "type": "task", "title": "Define research scope", "config": {"description": "Outline the key questions and boundaries"}},
            {"id": "s2", "type": "agent", "title": "Collect sources", "config": {"description": "Gather relevant documents and data"}},
            {"id": "s3", "type": "agent", "title": "Synthesize findings", "config": {"description": "Cross-reference and validate information"}},
            {"id": "s4", "type": "notify", "title": "Report ready", "config": {"title": "Research complete", "message": "Summary report is available"}},
        ],
    ),
    PlanTemplate(
        id="build_and_test",
        name="Build & Test",
        category="build",
        description="Implement a feature, write tests, and validate correctness.",
        steps=[
            {"id": "s1", "type": "task", "title": "Write specification", "config": {"description": "Define requirements and acceptance criteria"}},
            {"id": "s2", "type": "agent", "title": "Implement feature", "config": {"description": "Code the feature per spec"}},
            {"id": "s3", "type": "agent", "title": "Write tests", "config": {"description": "Unit and integration tests"}},
            {"id": "s4", "type": "agent", "title": "Review and merge", "config": {"description": "Code review and PR merge"}},
            {"id": "s5", "type": "notify", "title": "Build complete", "config": {"title": "Feature shipped", "message": "Build and test cycle finished"}},
        ],
    ),
    PlanTemplate(
        id="incident_response",
        name="Incident Response",
        category="ops",
        description="Detect, triage, resolve, and document a production incident.",
        steps=[
            {"id": "s1", "type": "task", "title": "Acknowledge alert", "config": {"description": "Confirm incident and assign owner"}},
            {"id": "s2", "type": "agent", "title": "Diagnose root cause", "config": {"description": "Investigate logs and traces"}},
            {"id": "s3", "type": "agent", "title": "Apply mitigation", "config": {"description": "Deploy fix or rollback"}},
            {"id": "s4", "type": "task", "title": "Write post-mortem", "config": {"description": "Document timeline and lessons learned"}},
            {"id": "s5", "type": "notify", "title": "Incident resolved", "config": {"title": "Incident closed", "message": "Post-mortem published"}},
        ],
    ),
    PlanTemplate(
        id="monitor_and_optimize",
        name="Monitor & Optimize",
        category="monitor",
        description="Continuous monitoring cycle with periodic optimization recommendations.",
        steps=[
            {"id": "s1", "type": "agent", "title": "Collect metrics", "config": {"description": "Gather cost, latency, and error rates"}},
            {"id": "s2", "type": "agent", "title": "Analyze trends", "config": {"description": "Compare against baselines and SLOs"}},
            {"id": "s3", "type": "agent", "title": "Generate recommendations", "config": {"description": "Identify optimization opportunities"}},
            {"id": "s4", "type": "notify", "title": "Optimization report", "config": {"title": "Optimization cycle complete", "message": "Recommendations ready for review"}},
        ],
    ),
    PlanTemplate(
        id="agent_workforce_scale",
        name="Scale Agent Workforce",
        category="ops",
        description="Assess current capacity and provision additional agents for increased workload.",
        steps=[
            {"id": "s1", "type": "task", "title": "Assess current utilization", "config": {"description": "Review active agent count and task queue depth"}},
            {"id": "s2", "type": "task", "title": "Define scaling target", "config": {"description": "Set target agent count and domain distribution"}},
            {"id": "s3", "type": "agent", "title": "Provision agents", "config": {"description": "Spawn new agents per scaling plan"}},
            {"id": "s4", "type": "notify", "title": "Scale complete", "config": {"title": "Workforce scaled", "message": "New agents are active"}},
        ],
    ),
]

_TEMPLATE_MAP = {t.id: t for t in _TEMPLATES}


class PlanningService:
    @staticmethod
    def list_templates() -> list[PlanTemplate]:
        return _TEMPLATES

    @staticmethod
    def generate_plan(req: GeneratePlanRequest) -> GeneratePlanResponse:
        template = _TEMPLATE_MAP.get(req.template_id)
        if template is None:
            from indra.core.exceptions import IndraException
            raise IndraException(status_code=404, error_code="template_not_found", message="Plan template not found")

        # Apply variables to step titles/descriptions
        steps = []
        for step in template.steps:
            s = dict(step)
            config = dict(s.get("config", {}))
            for key, val in req.variables.items():
                placeholder = f"{{{key}}}"
                s["title"] = s.get("title", "").replace(placeholder, val)
                for ck in list(config.keys()):
                    if isinstance(config[ck], str):
                        config[ck] = config[ck].replace(placeholder, val)
            s["config"] = config
            steps.append(s)

        task_steps = [s for s in steps if s["type"] in ("task", "agent")]

        return GeneratePlanResponse(
            goal_title=req.goal_title,
            template_id=req.template_id,
            definition={"steps": steps},
            recommended_agents=len([s for s in steps if s["type"] == "agent"]),
            estimated_tasks=len(task_steps),
        )
