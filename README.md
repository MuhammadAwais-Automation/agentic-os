<div align="center">

# Agentic OS

### Local-first command center for AI agent sessions, MCP servers, memory, approvals, and runs.

![Next.js](https://img.shields.io/badge/Next.js-14-111111?style=flat-square&logo=nextdotjs)
![Node.js](https://img.shields.io/badge/Bridge-Express%20%7C%20WebSocket-111111?style=flat-square&logo=nodedotjs)
![SQLite](https://img.shields.io/badge/Storage-SQLite-111111?style=flat-square&logo=sqlite)
![MCP](https://img.shields.io/badge/MCP-Agent%20Infrastructure-111111?style=flat-square)

</div>

Agentic OS is a personal command center for agentic development. It combines a Next.js dashboard with a local Express/WebSocket bridge so AI coding sessions, approvals, logs, memory, MCP server state, and agent runs can be reviewed from one place.

## At a Glance

| Area | Details |
|---|---|
| Product type | Local-first AI agent orchestration dashboard |
| Users | AI builders, agent developers, power users running local coding agents |
| Architecture | Next.js dashboard plus Express/WebSocket local bridge |
| Storage | SQLite-backed local persistence |
| Showcase value | AI infrastructure, MCP operations, local telemetry, and developer tooling |

## What It Proves

| Capability | Example in this project |
|---|---|
| Agent operations UX | Sessions, approvals, logs, memory graph, MCP state, run history |
| Local bridge architecture | Express/WebSocket bridge between local tools and the dashboard |
| Developer automation | Catalog, coding workspace, planning views, setup surfaces |
| Local-first infrastructure | SQLite persistence without requiring a hosted backend |
| AI systems thinking | Designed around Claude Code style sessions and MCP-enabled workflows |

## Product Surface

- Session command center for terminal-style AI coding workflows.
- Approval queue for reviewing pending agent actions.
- Run history with logs and visibility into agent activity.
- Memory graph viewer for agent context.
- MCP server management surface.
- Agent and skill catalog.
- Planning workspace for agent-driven work.

## Stack

| Layer | Technology |
|---|---|
| Dashboard | Next.js 14, React, TypeScript |
| UI | Framer Motion, Recharts, lucide-react |
| Terminal | xterm.js |
| Bridge | Express, WebSocket |
| Storage | SQLite |
| Repo | npm workspaces |

## Project Map

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

## Portfolio Note

Agentic OS sits inside a broader self-hosted AI workflow: MCP integrations, local agent orchestration, VPS-hosted services, automation servers, and AI-assisted development tooling.

## License

MIT
