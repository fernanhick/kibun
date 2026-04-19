# kibun — Claude Context

## Codebase Exploration Rules

- **Always use Graphify before exploring the codebase.** Read `graphify-out/graph.html` at the start of any task that requires understanding project structure, finding files, or tracing relationships between components. Do this even when not explicitly asked.
- Only fall back to Glob/Grep after consulting the graph, or for targeted lookups of a known symbol/path.
- The graph is the source of truth for architecture and file relationships. Do not rely solely on memory or assumptions about where things live.

