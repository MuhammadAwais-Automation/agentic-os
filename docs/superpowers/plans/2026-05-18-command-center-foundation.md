# Command Center Foundation Implementation Plan

Date: 2026-05-18
Scope: Phase 1 from `docs/agentic-os-advanced-command-center-plan.md`

## Goal

Turn the `Coding` page from a one-shot Claude prompt runner into the first working Command Center slice:

- browser PTY terminal
- selectable provider: PowerShell, Claude, Codex
- live stdin/stdout streaming
- basic run persistence in SQLite
- keep existing Graphify project detection and prompt runner working

## Implementation Tasks

1. Persist agent runs
   - Add `agent_runs` and `run_logs` tables in bridge DB migration.
   - Store provider, project path, command, status, timestamps, exit code.

2. Add PTY WebSocket
   - New `apps/bridge/src/ws/terminal.ts`.
   - Authenticate with existing token.
   - Spawn `powershell.exe`, `claude`, or `codex` in requested project path.
   - Stream JSON events: `ready`, `output`, `error`, `exit`.
   - Accept JSON client events: `input`, `resize`, `kill`.
   - Save output chunks to `run_logs`.

3. Wire bridge server
   - Route `/ws/terminal` in `apps/bridge/src/index.ts`.

4. Add dashboard terminal component
   - New `apps/dashboard/src/components/coding/TerminalPane.tsx`.
   - Use xterm with fit and web-links addons.
   - Connect to `/ws/terminal`.
   - Support provider selector changes from parent.

5. Upgrade Coding page
   - Add provider selector.
   - Add live terminal panel.
   - Keep Graphify and one-shot prompt runner.
   - Let one-shot runner use Claude or Codex.

6. Verify
   - `npm run build --workspace=apps/bridge`
   - `npm run build --workspace=apps/dashboard`

## Out of Scope For This Slice

- Approval queue UI
- Full agent timeline replay page
- MCP manager UI
- Skills catalog UI
- Native interactive Graphify canvas
- Claude subscription quota reverse engineering beyond existing session parser

