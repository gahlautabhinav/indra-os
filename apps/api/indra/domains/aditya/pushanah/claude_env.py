"""Scan the local Claude Code environment — the skills, subagents, MCP servers,
plugins and hooks the user has actually wired in. Read-only; never writes.

Sources:
  ~/.claude/skills/<name>/SKILL.md   (YAML frontmatter: name, description)
  ~/.claude/agents/<name>.md         (frontmatter: name, description, model)
  ~/.claude.json                     (mcpServers global + per-project)
  ~/.claude/plugins/installed_plugins.json
  ~/.claude/hooks/                   (hook scripts) + settings.json hooks
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

log = logging.getLogger(__name__)

_CLAUDE = Path.home() / ".claude"
_CLAUDE_JSON = Path.home() / ".claude.json"


def _read_frontmatter(path: Path) -> dict[str, str]:
    """Minimal YAML-frontmatter reader — pulls top-level scalar keys only."""
    out: dict[str, str] = {}
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return out
    if not text.startswith("---"):
        return out
    end = text.find("\n---", 3)
    block = text[3 : end if end != -1 else len(text)]
    for line in block.splitlines():
        if ":" not in line or line.startswith((" ", "\t", "#")):
            continue
        key, _, val = line.partition(":")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key in ("name", "description", "model", "color") and key not in out:
            out[key] = val
    return out


def _truncate(s: str, n: int = 160) -> str:
    s = s.replace("\\n", " ").strip()
    return s if len(s) <= n else s[:n].rstrip() + "…"


def _scan_skills(skills_dir: Path) -> list[dict]:
    if not skills_dir.exists():
        return []
    out: list[dict] = []
    for d in sorted(skills_dir.iterdir()):
        if not d.is_dir():
            continue
        fm = _read_frontmatter(d / "SKILL.md")
        out.append(
            {
                "name": fm.get("name", d.name),
                "description": _truncate(fm.get("description", "")),
            }
        )
    return out


def _scan_subagents(agents_dir: Path) -> list[dict]:
    if not agents_dir.exists():
        return []
    out: list[dict] = []
    for f in sorted(agents_dir.glob("*.md")):
        fm = _read_frontmatter(f)
        out.append(
            {
                "name": fm.get("name", f.stem),
                "description": _truncate(fm.get("description", "")),
                "model": fm.get("model"),
            }
        )
    return out


def _scan_mcp(claude_json: Path) -> list[dict]:
    if not claude_json.exists():
        return []
    try:
        data = json.loads(claude_json.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return []
    out: list[dict] = []
    seen: set[str] = set()

    def add(name: str, cfg: dict, scope: str) -> None:
        if name in seen:
            return
        seen.add(name)
        transport = cfg.get("type") or ("http" if cfg.get("url") else "stdio")
        out.append(
            {
                "name": name,
                "scope": scope,
                "transport": transport,
                "command": cfg.get("command") or cfg.get("url") or "",
            }
        )

    for name, cfg in (data.get("mcpServers") or {}).items():
        if isinstance(cfg, dict):
            add(name, cfg, "global")
    for _proj, pcfg in (data.get("projects") or {}).items():
        for name, cfg in (pcfg.get("mcpServers") or {}).items():
            if isinstance(cfg, dict):
                add(name, cfg, "project")
    return out


def _scan_plugins(installed_json: Path) -> list[dict]:
    if not installed_json.exists():
        return []
    try:
        data = json.loads(installed_json.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return []
    out: list[dict] = []
    for key, entries in (data.get("plugins") or {}).items():
        entry = entries[0] if isinstance(entries, list) and entries else {}
        name, _, market = key.partition("@")
        out.append(
            {
                "name": name,
                "marketplace": market or None,
                "version": entry.get("version"),
                "scope": entry.get("scope", "user"),
            }
        )
    return out


def _scan_hooks(hooks_dir: Path) -> list[dict]:
    if not hooks_dir.exists():
        return []
    out = []
    for f in sorted(hooks_dir.iterdir()):
        if f.is_file() and f.suffix in (".js", ".sh", ".ps1", ".py"):
            out.append({"name": f.name})
    return out


def scan_claude_environment() -> dict:
    skills = _scan_skills(_CLAUDE / "skills")
    subagents = _scan_subagents(_CLAUDE / "agents")
    mcp = _scan_mcp(_CLAUDE_JSON)
    plugins = _scan_plugins(_CLAUDE / "plugins" / "installed_plugins.json")
    hooks = _scan_hooks(_CLAUDE / "hooks")
    return {
        "skills": skills,
        "subagents": subagents,
        "mcp_servers": mcp,
        "plugins": plugins,
        "hooks": hooks,
        "counts": {
            "skills": len(skills),
            "subagents": len(subagents),
            "mcp_servers": len(mcp),
            "plugins": len(plugins),
            "hooks": len(hooks),
        },
    }
