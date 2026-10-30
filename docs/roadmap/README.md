# Roadmap

[Roadmap detalhado em português](roadmap.pt-BR.md)

Status: planning. This is a proposal, not a release schedule. Each increment is limited to five story points, independently reviewable and subject to real verification. The Portuguese roadmap contains the full dependencies and acceptance criteria.

The first milestone targets developers using a phone paired with a server on their computer: chat and read-only issues/PRs for one authorized GitHub repository. See the [developer-first delivery contract](developer-first.md) in Portuguese for operational limits, decision gates, acceptance targets and pilot requirements. Calendar and daily briefing follow acceptance of this milestone. The wider MVP targets one person using their own server. They can choose a local Liquid endpoint, Anthropic API, or a validated free cloud route via optional 9Router, connect GitHub and calendar for read access, and request a sourced daily briefing. The product is not implemented yet.

The mobile UI is dark-only, with its own identity inspired by Grok Bot. Evaluate Ionic React, assistant-ui primitives and Ionicons in a prototype; Apple design guidance informs the experience while Android behavior is also checked. Candidate colors and accessibility must be validated on real screens.

1. **Foundation:** maintain repository guidance, verify Codex and Claude Code skill discovery, and align proposed stack documentation.
2. **Feasibility:** evaluate Next.js and Ionic on mobile, secure local access, local and cloud models, mock tool calls and optional 9Router. Record results before selecting the stack.
3. **Onboarding and chat:** local HTTPS, device pairing and revocation, conversations, model configuration, language and setup.
4. **Tools and briefing:** bounded tool execution, skill loading, MCP, read-only GitHub and calendar connections, and a briefing with sources and partial errors.
5. **After MVP:** confirmed writes, voice, remote access, schedules, multiple users and additional providers, subject to separate decisions.

When nothing is configured, offer a validated free cloud route with explicit activation, provider and data disclosure, account requirements and limits. 9Router is a router, not a model provider; no shared key or unlimited availability is assumed. Automatic fallback to cloud or paid services requires explicit configuration and consent. Skills do not grant permissions. Store credentials server-side, define their lifecycle, and verify authentication and tool policies. Evaluate Portuguese and English cases on comparable settings; no quality or cost baseline exists yet. See [the spike plan](../spikes/mobile-agent.md) and [MVP architecture](../architecture/mvp.md).
