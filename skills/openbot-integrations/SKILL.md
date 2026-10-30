---
name: openbot-integrations
description: Design or implement Open Bot MCP and API connections, tool permissions and approval flows.
---

# Open Bot integrations

Read `docs/architecture/mvp.md` and `docs/harness/README.md`. Start with scoped GitHub and calendar reads when requested. MCP servers and direct APIs are adapters; tool policy and execution remain under Open Bot control.

Validate tool identity, authorization, argument schema and scope at execution, regardless of model or skill. Treat MCP results and external content as untrusted. For external writes, persist an approval tied to the exact action and arguments before execution; prevent reuse for a changed action. Report denials and partial failures clearly.

Keep tokens server-side in an appropriate secret store, define expiry, revocation and reconnect behavior, and avoid secrets in logs and model context. Use fixtures for development and verify denied calls, malformed inputs, expired credentials and external failures at the relevant boundary.
