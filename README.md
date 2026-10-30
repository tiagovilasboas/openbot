# Open Bot

**An open-source personal AI agent, designed for your phone and your choice of model.**

[Português](README.pt-BR.md) · [Architecture](docs/architecture/README.md) · [Stack candidates](docs/stacks/README.md) · [Contributing](CONTRIBUTING.md)

Open Bot started with a familiar pain: Grok Bot was too expensive for a broke Brazilian who wanted a personal agent. The idea is to build something accessible, open to contributions, and flexible enough to use a local model or an API key from a provider of your choice. Open Bot is an independent project and is not affiliated with Grok Bot.

**Status: planning.** There is no working application yet. The features below are goals to validate, not promises of existing functionality.

## The first useful experience

Ask from your phone: “What is on my calendar today, and which GitHub issues need my attention?” Open Bot would use approved connections and a reusable skill to prepare a briefing, with references to its sources.

The proposed MVP is a mobile-friendly PWA connected to a server on your computer. It aims to support:

- A locally hosted Liquid model or an external provider such as Anthropic, selected by the user.
- Reusable `SKILL.md` instructions and approved tools through MCP or direct APIs.
- Read access to GitHub and calendar data first; explicit approval before external changes.
- English and Brazilian Portuguese interfaces and documentation.

Provider compatibility, tool calling, Portuguese quality, mobile access and the proposed stack still need practical validation. An optional model router such as 9Router is a candidate, not a requirement. Local models need an inference server; cloud providers may charge for API usage.

## Design direction

The app will keep product behavior separate from provider and integration details. Skills provide instructions; they do not grant access. The project draws on [grok-bot-architecture](https://github.com/tiagovilasboas/grok-bot-architecture) for reusable roles, boundaries and approval patterns.

Read the [architecture principles](docs/architecture/README.md) and [stack candidates](docs/stacks/README.md). Ideas, questions and contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
