# Architecture principles

Open Bot is in the planning stage. These principles guide implementation decisions.

The [delivery gate contract](delivery-gates.md) documents the versioned Husky hooks, quality checks and CI gate for the application.

- **Screaming Architecture:** organize code around product capabilities and domains. Keep related behavior together.
- **Clean Code:** favor clear names, focused functions, explicit contracts, and understandable errors.
- **KISS:** choose the simplest design that meets current needs.
- **YAGNI:** add capabilities when a real use case requires them.
- **SRP:** give each module a cohesive responsibility and a clear reason to change.
- **Adapters:** isolate model providers, MCP servers, external APIs, storage, and interfaces behind focused boundaries. Domain behavior must not depend on provider details. Add abstractions when a real boundary warrants them.

Skills describe procedures and do not grant permissions. Tool execution is controlled by the host; actions that modify external data require explicit approval. See [grok-bot-architecture](https://github.com/tiagovilasboas/grok-bot-architecture) for the reference patterns.
