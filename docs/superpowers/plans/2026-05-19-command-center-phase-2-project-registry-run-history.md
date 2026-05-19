# Command Center Phase 2 Plan: Project Registry + Run History

Date: 2026-05-19  
Project: `E:\Dashboard OS\agentic-os`  
Planner mode: Phase plan only, no implementation.

## Goal

Phase 1 ne Command Center ka live terminal foundation add kar diya. Phase 2 ka goal yeh hai ke dashboard project ko sirf path input na samjhe, balke proper managed workspace samjhe:

- projects save/list/open ho sakein
- har project ka framework/package manager/git/Graphify status detect ho
- terminal/Claude/Codex runs searchable history mein aayein
- run replay/transcript UI ho
- Graphify aur sessions project ke sath linked ho jayein

Short version: `Coding` page ko "type path and run" se "select project, inspect state, replay runs" wali command center foundation pe lana.

## Why This Phase Next

Phase 1 terminal useful hai, lekin teen gaps abhi major hain:

1. User ko har dafa project path manually dena parta hai.
2. `agent_runs` aur `run_logs` DB mein save ho rahe hain, lekin UI mein visible/replayable nahi.
3. Graphify status path-based hai, project lifecycle ke sath connected nahi.

Phase 2 in teeno ko solve karega. Is ke baad agents/skills/MCP panels add karna clean ho jayega, kyun ke un sab ko active project context mil jayega.

## Scope

### In Scope

- `projects` table
- project CRUD/list/recent APIs
- project scanner service
- run history APIs
- run replay/transcript APIs
- Coding page project selector
- right/bottom run history panel
- project metadata cards
- Graphify status stored per project
- basic stale graph detection

### Out Of Scope

- full native D3 Graphify viewer
- approvals/control queue
- MCP manager
- skills/agents catalog
- Dream Engine v2 recommendations
- Gemini CLI integration
- destructive command policy engine

## Data Model

### `projects`

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  last_opened_at INTEGER,
  framework TEXT,
  package_manager TEXT,
  git_branch TEXT,
  git_dirty INTEGER NOT NULL DEFAULT 0,
  graphify_status TEXT NOT NULL DEFAULT 'unknown',
  graphify_updated_at INTEGER
);
```

### `agent_runs` additions

Current Phase 1 table exists. Add optional metadata columns:

```sql
ALTER TABLE agent_runs ADD COLUMN project_id TEXT;
ALTER TABLE agent_runs ADD COLUMN mode TEXT NOT NULL DEFAULT 'terminal';
ALTER TABLE agent_runs ADD COLUMN title TEXT;
```

If SQLite column already exists, migration should ignore safely.

## Backend Modules

### 1. Project scanner

Create:

```txt
apps/bridge/src/services/projectScanner.ts
```

Responsibilities:

- validate path exists and is directory
- detect project name from folder basename
- detect package manager:
  - `pnpm-lock.yaml` -> pnpm
  - `yarn.lock` -> yarn
  - `package-lock.json` -> npm
  - `bun.lockb` / `bun.lock` -> bun
- detect framework:
  - `next.config.*` -> Next.js
  - `vite.config.*` -> Vite
  - `package.json` deps for React/Next/Express/etc.
  - `pyproject.toml` -> Python
  - `Cargo.toml` -> Rust
  - `go.mod` -> Go
- detect git branch:
  - run `git -C <path> branch --show-current`
  - dirty via `git -C <path> status --short`
- detect Graphify:
  - missing: no `graphify-out`
  - partial: folder exists but no `graph.json`
  - ready: `graph.json` exists
  - stale: source files newer than `graph.json`

### 2. Project registry route

Create:

```txt
apps/bridge/src/routes/projects.ts
```

Endpoints:

```txt
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id/refresh
PATCH  /api/projects/:id/open
DELETE /api/projects/:id
```

Request examples:

```json
POST /api/projects
{
  "path": "E:\\Dashboard OS\\agentic-os"
}
```

Response shape:

```ts
interface ProjectRecord {
  id: string
  name: string
  path: string
  framework: string | null
  packageManager: string | null
  gitBranch: string | null
  gitDirty: boolean
  graphifyStatus: 'unknown' | 'missing' | 'partial' | 'ready' | 'stale'
  createdAt: number
  lastOpenedAt: number | null
}
```

### 3. Run history route

Create:

```txt
apps/bridge/src/routes/runs.ts
```

Endpoints:

```txt
GET /api/runs?projectId=&projectPath=&limit=50
GET /api/runs/:id
GET /api/runs/:id/logs
PATCH /api/runs/:id/title
```

Run list fields:

- id
- provider
- mode
- project path/name
- command
- status
- started/ended
- duration
- exit code
- title
- first/last log snippet

Run logs:

- ordered by `ts`
- stream: stdout/stderr/stdin/system
- data

### 4. Terminal integration

Update:

```txt
apps/bridge/src/ws/terminal.ts
```

Changes:

- accept `projectId` query param
- if `projectId` is present, load path from DB
- save `project_id` into `agent_runs`
- set default run title:
  - `PowerShell terminal`
  - `Claude Code session`
  - `Codex session`
- update project's `last_opened_at`

## Frontend Modules

### 1. Project selector component

Create:

```txt
apps/dashboard/src/components/coding/ProjectSelector.tsx
```

Features:

- recent projects dropdown
- add project by path
- refresh metadata button
- display framework/package manager/git branch/Graphify status
- emits active `projectId` and `projectPath`

### 2. Project summary panel

Create:

```txt
apps/dashboard/src/components/coding/ProjectSummary.tsx
```

Cards:

- framework
- package manager
- git branch + dirty badge
- Graphify status
- last opened

### 3. Run history panel

Create:

```txt
apps/dashboard/src/components/coding/RunHistoryPanel.tsx
```

Features:

- latest runs list
- filter by provider
- status badges: running/exited/cancelled/error
- click run to open replay
- show duration and exit code

### 4. Run replay panel

Create:

```txt
apps/dashboard/src/components/coding/RunReplay.tsx
```

Features:

- log stream rendered in terminal-style panel
- stdin/stdout/system visually separated
- copy transcript button
- optional title edit

### 5. Coding page restructure

Update:

```txt
apps/dashboard/src/app/coding/page.tsx
```

Recommended layout:

```txt
Top: ProjectSelector + provider selector
Left/Center: TerminalPane
Right: ProjectSummary + RunHistoryPanel
Bottom: Graphify quick status + One-shot prompt + RunReplay drawer
```

Keep layout simple first. Avoid full redesign until components work.

## API Client Helpers

Create:

```txt
apps/dashboard/src/lib/projects.ts
apps/dashboard/src/lib/runs.ts
```

Purpose:

- typed fetch helpers
- keep page component smaller
- reuse auth headers

## Acceptance Criteria

Phase 2 is done when:

1. User can add `E:\Dashboard OS\agentic-os` as a project once.
2. Project appears in recent projects dropdown after refresh/page reload.
3. Project metadata shows:
   - framework/package manager
   - git branch or "no git"
   - Graphify ready/missing/stale
4. Starting a terminal run attaches it to active project.
5. Run history shows new PowerShell/Claude/Codex run.
6. Clicking a run opens transcript/replay.
7. Existing Graphify check/load still works.
8. Builds pass:
   - `npm run build --workspace=apps/bridge`
   - `npm run build --workspace=apps/dashboard`

## Verification Plan

### Backend

```txt
npm run build --workspace=apps/bridge
```

Manual API smoke:

```txt
GET  /api/config/status
POST /api/projects
GET  /api/projects
GET  /api/runs
GET  /api/runs/:id/logs
```

### Frontend

```txt
npm run build --workspace=apps/dashboard
```

Manual UI smoke:

- open `/coding`
- add current repo as project
- select project
- start PowerShell terminal
- run a harmless command like `pwd`
- kill/close terminal
- verify run appears in history
- open replay

## Risks

### Path security

Risk: browser can register/run arbitrary folders.

Mitigation for Phase 2:

- validate path exists
- only use user-provided explicit project paths
- do not auto-scan whole disk
- later add trusted roots policy

### Git commands hanging

Risk: metadata refresh waits on git.

Mitigation:

- use short timeout
- handle no-git gracefully
- metadata refresh should never block app startup

### Large run logs

Risk: long Claude/Codex sessions make DB heavy.

Mitigation:

- run list only loads snippets
- logs endpoint paginates or limits later
- Phase 2 can load complete logs for now, but structure should allow pagination

### UI complexity

Risk: Coding page becomes too large again.

Mitigation:

- split components immediately
- keep page as state/router shell only

## Recommended Implementation Order

1. DB migration for `projects` and `agent_runs` additions.
2. `projectScanner.ts`.
3. `/api/projects` route.
4. `/api/runs` route.
5. Update terminal WS with `projectId`.
6. Dashboard API helpers.
7. `ProjectSelector`.
8. `ProjectSummary`.
9. `RunHistoryPanel`.
10. `RunReplay`.
11. Update Coding page layout.
12. Build + smoke test.

## Next Phase After This

Phase 3 should be Graphify Manager:

- build/update graph buttons
- graph report viewer
- native D3 graph viewer
- node search/filter
- stale graph warnings

