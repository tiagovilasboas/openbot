---
name: openbot-data
description: Design or implement Open Bot conversation persistence, SQLite storage and data lifecycle.
---

# Open Bot data

Read `docs/architecture/mvp.md`. SQLite is a candidate, not a validated decision or a secret manager. Keep conversation, preferences and approval data owned by their respective domains; expose storage through focused boundaries rather than database details in UI or model adapters.

For a change, define what must survive restart, what may be deleted and how schema changes and recovery work. Handle interrupted writes and concurrency according to the actual deployment. Do not store tokens or private conversation content in logs or fixtures. Check persistence, migrations and deletion behavior when implemented; report gaps explicitly.
