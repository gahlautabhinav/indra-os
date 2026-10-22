## graphify

This project has an enriched knowledge graph at graphify-out/ (code structure + AI reading of docs, SQL and code), built by graph-enrich.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- Navigate graphify-out/agentic-os-wiki/_wiki/index.md (one article per area) instead of reading raw files
- If the graphify MCP server is active, utilize tools like `query_graph`, `get_node`, and `shortest_path` for precise architecture navigation instead of falling back to `grep`
- If the MCP server is not active: `py -3.10 ~/.claude/skills/graph-enrich/scripts/enrich.py ask "<question>"` for questions, `py -3.10 -m graphify path "<A>" "<B>"` and `py -3.10 -m graphify explain "<concept>"` for named things — prefer these over grep. Skip `graphify query` (prints busiest nodes, not the answer)
- After modifying code files, refresh the graph with `/graph-sync` (Claude Code) or `py -3.10 ~/.claude/skills/graph-enrich/scripts/enrich.py refresh --root .` (free, keeps the AI layer)
- NEVER run `graphify update .`, `graphify hook install` or `/graphify --update` — they rebuild graph.json from code alone and drop the AI layer
