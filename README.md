# Open Bot

**An open-source personal AI agent, designed for your phone and your choice of model.**

[Português](README.pt-BR.md) · [Architecture](docs/architecture/README.md) · [Stack candidates](docs/stacks/README.md) · [Contributing](CONTRIBUTING.md)

Open Bot started with a familiar pain: Grok Bot was too expensive for a broke Brazilian who wanted a personal agent. The idea is to build something accessible, open to contributions, and flexible enough to use a local model or an API key from a provider of your choice. Open Bot is an independent project and is not affiliated with Grok Bot.

**Status: early prototype.** A local chat spike runs in desktop Chrome with a simulated calendar tool and fictional data. No model/provider, real calendar, GitHub connection, or credential flow is connected. Mobile installation and iOS/Android behavior have not been tested; the current manifest does not include a service worker or establish secure phone access.

## The first useful experience

The first milestone serves developers: ask from your phone for a sourced summary of issues and PRs in an authorized repository. Calendar and a daily briefing follow once this workflow is validated. See the [roadmap](docs/roadmap/README.md) and [developer-first delivery plan](docs/roadmap/developer-first.md).

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

Open Bot is open source from the start, under the [MIT license](LICENSE).

## Support the project

Open Bot is maintained by Tiago Vilas Boas. If you want to support its development, [sponsor on GitHub](https://github.com/sponsors/tiagovilasboas). Sponsorship is optional; contributions, feedback and bug reports are also welcome.
