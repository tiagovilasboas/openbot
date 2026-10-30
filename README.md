# Open Bot

Open Bot is a planned open-source personal AI agent designed for mobile use and local-first operation. Connect a local model or bring your own provider credentials, then use the agent to work with your tools and reusable skills.

**Status: planning.** The application and integrations have not been implemented yet.

## First milestone

The proposed MVP is a mobile-friendly PWA connected to a server running on a personal computer. The first useful workflow is a daily briefing based on calendar events and GitHub issues.

- Chat with a locally hosted Liquid AI model, with the option to configure external model providers.
- Load reusable `SKILL.md` instructions when relevant.
- Connect to approved MCP servers and service APIs, beginning with read access to GitHub and calendar data.
- Keep credentials on the server and require explicit approval for actions that change external data.

Provider compatibility, tool calling, model quality in Portuguese, authentication, and mobile access are still to be evaluated.

## Architecture direction

The mobile interface communicates with an agent server, which selects a model and controls access to tools. Skills provide instructions; they do not grant permissions. The project draws on the patterns and role boundaries documented in [grok-bot-architecture](https://github.com/tiagovilasboas/grok-bot-architecture).

React, TypeScript, a PWA, and SQLite are initial candidates, subject to validation during implementation.

## License

[MIT](LICENSE)
