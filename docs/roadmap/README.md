# Roadmap

This is a proposal, not a release schedule. Each increment should be usable or independently verifiable, reviewed in a small PR, and merged only after required checks pass. Estimates use Fibonacci story points for uncertainty and effort, not time.

| Order | Increment | Points | Depends on | Acceptance |
| --- | --- | ---: | --- | --- |
| 1 | Repository guidance and delivery gate | 3 | None | Public project guidance, versioned hooks and CI agree on a documented check. |
| 2 | Mobile and provider feasibility spike | 5 | 1 | Record actual results for iPhone/Android, Next.js + Ionic, local inference and an external provider; document a decision and limitations. |
| 3 | Chat and conversation persistence | 5 | 2 | A user can start and resume a conversation, see streamed output and recover from provider failure. |
| 4 | Model configuration | 5 | 2 | Select a local endpoint or a supported cloud provider; keep credentials server-side and show which model receives a request. |
| 5 | Skills and bounded tool execution | 5 | 3, 4 | Load a selected skill on demand; validate tool requests and prevent skills from granting permissions. |
| 6 | GitHub read integration | 3 | 5 | Connect an account, list permitted issues or PRs and show source references. |
| 7 | Calendar read integration | 5 | 5 | Connect an account, list events in a requested period and handle expired authorization. |
| 8 | Daily briefing | 3 | 6, 7 | Summarize calendar and GitHub results with references and visible partial failures. |
| 9 | Confirmed external writes | 5 | 5, relevant connector | Show the exact proposed action, execute only after approval and record the outcome. |

GitHub and calendar integration can proceed in parallel after the tool boundary is stable. Voice, autonomous schedules, background execution, native app stores, multi-agent teams and a mandatory hosted gateway are later candidates. Split any increment further if it exceeds five points or cannot be reviewed and merged independently.

## Evaluation before expansion

Start with a small, versioned set of real, consented scenarios in Portuguese and English: chat, skill selection, tool choice, malformed arguments, denied permissions and partial connector failures. Compare Liquid local and each supported cloud provider under the same conditions. Record accepted outcomes, failures, latency, token usage where available, retries and human corrections. Define a baseline and acceptance threshold before asserting that a model, router or cost change improves the experience. No baseline has been collected yet.

## Open decisions

- Next.js and Ionic compatibility, mobile PWA behavior and local network connectivity.
- Which inference server supports the selected Liquid model and required tool calls.
- OAuth setup, credential storage and recovery for each connector.
- Whether optional 9Router provides enough value for its additional process and operational cost.
- Exact mobile visual identity and accessibility targets.
