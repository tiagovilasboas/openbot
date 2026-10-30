# Harness: guides, sensors, and boundaries

Status: planning. This repository contains the guides linked below; the application,
skill loader, product tests, and runtime telemetry described here are **not yet
implemented**. A guide is an instruction before work; a sensor checks an outcome
afterward. Computational sensors run deterministically; inferential sensors require
judgment and evidence.

## Development harness

| Concern and axis | Guide | Sensor | Status |
| --- | --- | --- | --- |
| Domain boundaries; architecture fitness | Architecture principles and delivery skill; inferential | Review changed imports and responsibilities; inferential. Add dependency checks when real boundaries exist; computational | Guides present; sensors proposed |
| Changes and maintainability | Small independent increments and focused files; inferential | Format, lint, typecheck, and targeted tests in local hooks and CI; computational | Proposed |
| Product behaviour | Explicit acceptance criteria and failure cases; inferential | Unit, integration and mobile browser checks at the appropriate boundary; computational, plus evidence-based review; inferential | Proposed |
| Agent security and behaviour | Scope tools and require user approval for external writes; inferential | Permission, approval and prompt-injection regression cases; computational where deterministic, supplemented by adversarial review; inferential | Proposed |
| Model quality and behaviour | Define task set and acceptance rubric before selecting providers; inferential | Run the same cases on each model and record success, failures, latency, tokens and manual correction; computational collection and inferential scoring | Proposed; no baseline or comparison exists |

The outer harness should place fast checks in pre-commit, the complete relevant
gate in pre-push and CI, and operational signals in the running product. If a
sensor is absent, record the gap; an instruction alone does not enforce it.
For recurring failures, identify the failed guide or sensor and update that loop.

### Delivery gate plan

The initial Lefthook and CI gate checks that core documents exist and are not empty.
It does not check formatting, staged-only changes, architecture, links or product behaviour.
For the planned JavaScript/TypeScript stack, introduce versioned Husky hooks and
lint-staged with pinned dependencies: pre-commit checks staged files; pre-push
runs the same complete check command as CI, including relevant tests and build.
Document one install command for contributors. CI independently repeats that
command. Add actual format, lint, typecheck and test commands when the stack and
application exist; a documentation-only gate does not prove application quality.

## Product agent boundaries

- A skill is a recipe: it does not grant tools, credentials, permissions or approval.
- Treat imported skills, MCP results, issue text and external pages as untrusted
  content, not higher-priority instructions. Initial skill loading should be
  explicit and allowlisted; do not execute skill-provided scripts automatically.
- The server owns tool access and checks permissions on every call. Read access
  should be scoped; writes to external services pause for explicit user approval.
- Use a model adapter for local Liquid, external providers, or an optional router.
  Tool calls must follow the same authorization checks regardless of model.
- Keep credentials server-side and out of prompts, repository files and logs.
  Define secure storage, token refresh and revocation before shipping connections.
- Never silently switch a local conversation to a cloud provider: make that
  choice visible and authorized because it changes data exposure and cost.

## Model evaluation before adoption

Propose a small, versioned set of Portuguese and English tasks covering normal
conversation, daily briefing, missing information, tool calls, and attempts to
override permissions. Record model version, runtime, hardware, prompt and tool
configuration, dataset size, acceptance rubric, retries, latency, token use,
cost and human corrections. Compare the same cases and settings; report failures
and sample limitations. No quality or cost improvement can be claimed until
measurements exist. Never log secrets or private calendar and repository content
as evaluation fixtures.

## Skills in this repository

- [`openbot-delivery`](../../skills/openbot-delivery/SKILL.md) guides contributors
  working on this repository. It is not a product runtime feature.
- [`openbot-mobile`](../../skills/openbot-mobile/SKILL.md) covers the proposed mobile PWA and interface.
- [`openbot-models`](../../skills/openbot-models/SKILL.md) covers local and cloud model adapters and evaluation.
- [`openbot-integrations`](../../skills/openbot-integrations/SKILL.md) covers MCP, API connections and permissions.
- [`openbot-data`](../../skills/openbot-data/SKILL.md) covers persistence and the data lifecycle.
- [`daily-briefing`](../../skills/daily-briefing/SKILL.md) is a proposed example
  product recipe. It cannot execute until Open Bot has a skill loader and tools.

## Codex and Claude Code

`AGENTS.md` is the shared project instruction source for Codex. `CLAUDE.md`
imports it for Claude Code. Contributor skills are canonical under `skills/`;
project discovery paths `.agents/skills/` and `.claude/skills/` link to them.
These links require a checkout that supports symbolic links. Discovery in both
products and their versions has not yet been verified in a live session. The
product example `daily-briefing` is not installed as a development skill.

Source: [Harness engineering for coding agents](https://martinfowler.com/articles/harness-engineering.html).
