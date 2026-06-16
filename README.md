# Agentic OS

Local-first AI agent orchestration dashboard for monitoring Claude Code sessions, MCP servers, agent runs, memory graphs, and provider usage from one control center.

Agentic OS was built as a personal command center for agentic development. It combines a Next.js dashboard with a local Express/WebSocket bridge so agent sessions, approvals, logs, memory, and MCP server state can be reviewed in one place.

## Features

- Command center for Claude Code style terminal sessions
- Approval queue for reviewing pending agent actions
- Run history with logs and session visibility
- Memory graph viewer for agent context
- MCP server management surface
- Agent and skill catalog
- Planning workspace for agent workflows
- Local SQLite-backed bridge for session persistence

## Tech Stack

| Layer | Technology |
|---|---|
| Dashboard | Next.js 14, React, TypeScript |
| UI | Framer Motion, Recharts, lucide-react |
| Terminal | xterm.js |
| Bridge | Express, WebSocket |
| Storage | SQLite |
| Repo | npm workspaces |

## Project Structure

```text
apps/
  dashboard/       Next.js frontend
  bridge/          Express and WebSocket bridge
packages/          Shared packages
config/            Local configuration
scripts/           Utility scripts
docs/              Project documentation
```

## Run Locally

```bash
npm run install:all
npm run dev
```

Dashboard runs on `http://localhost:3000`.
Bridge runs on `http://localhost:3001`.

## Portfolio Context

This project is part of a broader self-hosted AI infrastructure workflow involving MCP integrations, local agent orchestration, VPS-hosted services, and developer automation.

## License

MIT
