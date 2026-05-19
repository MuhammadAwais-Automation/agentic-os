# Agentic OS

A local-first AI agent orchestration dashboard built with Next.js 14. Monitor, manage, and interact with Claude Code sessions, MCP servers, agent runs, memory graphs, and provider usage — all from one sleek cyberpunk interface.

## Features

- **Home Dashboard** — Live stats, attention queue, recent runs, provider usage bars
- **Command** — Integrated terminal for Claude Code sessions
- **Approvals** — Review and approve pending agent actions
- **Runs** — Full session history and logs
- **Memory** — Knowledge graph viewer
- **Dream** — Agent planning workspace
- **MCP** — Model Context Protocol server management
- **Catalog** — Agent and skill catalog
- **Settings** — Configuration and preferences

## Stack

- [Next.js 14](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/)
- [Framer Motion](https://www.framer.com/motion/) — animations
- [Recharts](https://recharts.org/) — data visualization
- [lucide-react](https://lucide.dev/) — icons
- [xterm.js](https://xtermjs.org/) — terminal emulation
- SQLite bridge for local session persistence

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Install

```bash
pnpm install
```

### Run

```bash
pnpm --filter dashboard dev
```

App runs at `http://localhost:3000`. Bridge API runs at `http://localhost:3001`.

## Project Structure

```
apps/
  dashboard/          # Next.js frontend
    src/
      app/            # App Router pages
      components/     # UI + layout components
      styles/         # Global CSS tokens
packages/             # Shared packages
```

## License

Private — all rights reserved.
