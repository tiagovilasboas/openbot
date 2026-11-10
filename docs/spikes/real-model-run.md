# Real model run

Date: 2026-11-10T19:32:56.581Z
Server: http://localhost:3801
Open Bot commit: a7cba22, Next 16.4.3, Node v22.23.1
Result: 10 of 10 cases passed. A failure below is a real failure, not a simulated one.

The provider and model are whatever the server was configured with; this report carries no key or token. Configured here: OpenRouter, `google/gemma-4-31b-it:free`, through the server environment (not the browser).
A value in the Failover column means the configured model did not answer and the fallback did, so that reply is not the configured model's. A case counts as ok when it returned text; it does not judge quality or language.

## What this run does not prove

- **The configured model did not always answer.** Plain chat (PT and EN) and both delegations show `google/gemma-4-31b-it:free -> openrouter/free`: the fallback answered. The cause is unknown; the server log has no error or 429, and a free-tier limit is only a guess.
- **The stream cases show no failover**, so they probably used the configured model, but the plain route does not report which model answered ("model not reported"), so this is not confirmed.
- **The PT delegation reply came back in English** for a Portuguese request. Whether that is the model or the synthesis rule was not investigated.
- **Delegation and skill suggestion report no usage.** Not checked whether that is by design.
- **Not covered:** attachments, per-bot memory, the team room, and the browser UI. This ran through the API, so the screens remain untested against a real model.
- One run, one model, one day: latency (2 s for a chat, 31 s for the first delegation) is a sample, not a measure.

| Lang | Case                               | Result |    ms | Detail                                                 | Usage                                 | Failover                                      | Reply (clipped)                                                                            |
| ---- | ---------------------------------- | ------ | ----: | ------------------------------------------------------ | ------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| pt   | chat (/api/chat)                   | ok     |  2094 | router / model not reported                            | {"inputTokens":14,"outputTokens":68}  | google/gemma-4-31b-it:free -> openrouter/free | Eu li a sua mensagem.                                                                      |
| pt   | stream (/api/chat/stream)          | ok     |  2269 | done, 3 deltas, first delta 1385 ms                    | {"inputTokens":32,"outputTokens":27}  |                                               | Sim, li sua mensagem.                                                                      |
| pt   | failover (bad per-bot model id)    | ok     |  2112 | router / model not reported                            | {"inputTokens":32,"outputTokens":27}  | openbot/does-not-exist -> openrouter/free     | Sim, li sua mensagem.                                                                      |
| pt   | delegation (Chief to a specialist) | ok     | 31516 | delegated to 1 specialist(s)                           |                                       | google/gemma-4-31b-it:free -> openrouter/free | Following the Engineering team's analysis, here’s a summary of the key risks of storing da |
| pt   | suggest a skill                    | ok     |  9041 | draft "Resumir PR em 3 pontos" /resumir-pr-em-3-pontos |                                       |                                               | Sempre que o usuário pedir um resumo de PR, entregue exatamente três tópicos curtos: (1) o |
| en   | chat (/api/chat)                   | ok     |  1490 | router / model not reported                            | {"inputTokens":27,"outputTokens":32}  | google/gemma-4-31b-it:free -> openrouter/free | I confirm that I have read your message.                                                   |
| en   | stream (/api/chat/stream)          | ok     |  2419 | done, 2 deltas, first delta 2399 ms                    | {"inputTokens":27,"outputTokens":28}  |                                               | I’ve read your message.                                                                    |
| en   | failover (bad per-bot model id)    | ok     |  4273 | router / model not reported                            | {"inputTokens":27,"outputTokens":225} | openbot/does-not-exist -> openrouter/free     | Message received and confirmed.                                                            |
| en   | delegation (Chief to a specialist) | ok     | 12809 | delegated to 1 specialist(s)                           |                                       | google/gemma-4-31b-it:free -> openrouter/free | **Risk:** XSS (Cross‑Site Scripting) theft – malicious scripts injected into the page can  |
| en   | suggest a skill                    | ok     | 10763 | draft "PR Three-Point Summary" /pr-three-point-summary |                                       |                                               | When asked to summarize a PR in three points, first retrieve the PR details (title, descri |
