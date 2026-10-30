# Roadmap

[Roadmap detalhado em português](roadmap.pt-BR.md)

Status: planning. This is a proposal, not a release schedule. Each increment is limited to five story points, independently reviewable and subject to real verification. The Portuguese roadmap contains the full dependencies and acceptance criteria.

The MVP targets one person using a phone paired with a server on their computer. They can choose a local Liquid endpoint or Anthropic API, connect GitHub and calendar for read access, and request a sourced daily briefing. The product is not implemented yet.

1. **Foundation:** maintain repository guidance, verify Codex and Claude Code skill discovery, and align proposed stack documentation.
2. **Feasibility:** evaluate Next.js and Ionic on mobile, secure local access, local and cloud models, mock tool calls and optional 9Router. Record results before selecting the stack.
3. **Onboarding and chat:** local HTTPS, device pairing and revocation, conversations, model configuration, language and setup.
4. **Tools and briefing:** bounded tool execution, skill loading, MCP, read-only GitHub and calendar connections, and a briefing with sources and partial errors.
5. **After MVP:** confirmed writes, voice, remote access, schedules, multiple users and additional providers, subject to separate decisions.

A local conversation must never silently switch to a cloud provider. Skills do not grant permissions. Store credentials server-side, define their lifecycle, and verify authentication and tool policies. Evaluate Portuguese and English cases on comparable settings; no quality or cost baseline exists yet. See [the spike plan](../spikes/mobile-agent.md) and [MVP architecture](../architecture/mvp.md).
