---
name: openbot-models
description: Implement or evaluate Open Bot model adapters for local Liquid, Anthropic, compatible endpoints and optional 9Router.
---

# Open Bot models

Read `docs/architecture/mvp.md` and `docs/spikes/mobile-agent.md`. Model selection, runtime and router are proposed until tested. Use a provider-neutral contract at the domain boundary; implement provider authentication, message translation, streaming, tool calls and error mapping in adapters.

Make the selected provider and model visible. Do not silently route local inputs to a cloud provider or turn on fallback without user authorization. Keep credentials server-side and out of logs and prompts. A local model requires an independently reachable inference endpoint.

Evaluate each supported path with the same versioned tasks and fixtures, including Portuguese, malformed tool arguments, timeout and unavailable provider. Record versions, hardware, sample, outcomes, latency, token counts and costs where available. Do not claim equivalent quality or lower cost without comparable evidence.
