# Domain context

Keep the project's domain context in a single root-level `CONTEXT.md`. Keep architecture decision records under `docs/adr/`. Create these files when the work calls for them; their absence does not block unrelated work.

When working on domain behavior or terminology, read `CONTEXT.md` if present and use its glossary terms consistently in code and documentation. When a change touches an architecture decision, read relevant records in `docs/adr/` if present. Flag a conflict with a recorded decision before implementing a conflicting approach, and describe the conflict when reporting the work.
