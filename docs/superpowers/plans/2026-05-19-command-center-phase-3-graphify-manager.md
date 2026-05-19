# Command Center Phase 3 Plan: Graphify Manager

Date: 2026-05-19  
Project: `E:\Dashboard OS\agentic-os`  
Planner mode: Phase plan only, no implementation.

## Goal

Phase 3 ka goal Graphify ko side-info se first-class project brain banana hai. Ab project registry aur run history aa chuki hain, is liye Graphify ko active project ke sath attach karna chahiye:

- graph status clear ho
- stale/missing/partial/ready states visible hon
- graph build/update run history mein save ho
- `GRAPH_REPORT.md` dashboard mein readable ho
- `graph.html` preview/open ho
- native graph UI mein nodes, communities, search/filter, top connected files dikhein

Short version: Graphify ko "files found" badge se "project architecture brain map" banana.

## Current State

Existing backend:

- `apps/bridge/src/routes/graphify.ts`
  - `GET /api/graphify/check`
  - `GET /api/graphify/graph`
- `apps/bridge/src/services/graphParser.ts`
  - reads `graphify-out/graph.json`
  - fallback reads `GRAPH_REPORT.md`
- `apps/bridge/src/ws/graphifyInstall.ts`
  - installs graphify through WebSocket

Existing project output:

- `graphify-out/graph.json`
- `graphify-out/graph.html`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/manifest.json`
- current project status from Phase 2 scanner: `stale`

Main gaps:

- no report endpoint
- no HTML preview endpoint
- no build/update endpoint
- no graph stale details
- no native graph canvas
- no communities/search/filter UI
- no Graphify run saved as `agent_runs`

## Scope

### In Scope

- Graphify manager service
- status/report/html endpoints
- build/update WebSocket or run-backed endpoint
- project `graphify_status` refresh after build/update
- Graphify panel in Coding page
- native D3 force graph component
- node search/filter/community list
- report viewer tabs
- run history integration for graphify runs

### Out Of Scope

- AI graph Q&A
- semantic search over graph
- automatic graph rebuild cron
- multi-project graph comparison
- Graphify cloud upload/share
- full path-finder algorithms beyond simple adjacency view

## Backend Plan

### 1. Create Graphify manager service

Create:

```txt
apps/bridge/src/services/graphifyManager.ts
```

Responsibilities:

- resolve project by `projectId` or `projectPath`
- calculate Graphify status:
  - `missing`: no `graphify-out`
  - `partial`: folder exists but core files missing
  - `ready`: `graph.json` + `GRAPH_REPORT.md` exist and not stale
  - `stale`: source files newer than `graph.json`
  - `failed`: last graphify run failed
- return file paths:
  - `graphJsonPath`
  - `reportPath`
  - `htmlPath`
  - `manifestPath`
- parse summary stats:
  - nodes
  - edges
  - communities
  - top connected nodes
  - file type counts
- update `projects.graphify_status` and `graphify_updated_at`

Recommended shared types:

```ts
type GraphifyStatus = 'missing' | 'partial' | 'ready' | 'stale' | 'building' | 'failed'

interface GraphifyStatusResponse {
  status: GraphifyStatus
  projectId?: string
  projectPath: string
  files: {
    graphJson: boolean
    report: boolean
    html: boolean
    manifest: boolean
  }
  updatedAt: number | null
  newestSourceAt: number | null
  stats: {
    nodes: number
    edges: number
    communities: number
    topNodes: Array<{ id: string; label: string; connections: number; filePath: string }>
    fileTypes: Array<{ type: string; count: number }>
  }
}
```

### 2. Expand Graphify routes

Update:

```txt
apps/bridge/src/routes/graphify.ts
```

Add:

```txt
GET  /api/graphify/status?projectId=&projectPath=
GET  /api/graphify/report?projectId=&projectPath=
GET  /api/graphify/html?projectId=&projectPath=
GET  /api/graphify/manifest?projectId=&projectPath=
POST /api/graphify/refresh-project
```

Keep compatibility:

```txt
GET /api/graphify/check
GET /api/graphify/graph
```

Response behavior:

- `report` returns markdown text + path + modified time
- `html` returns HTML file content or URL-safe preview body
- `manifest` returns parsed JSON if present
- all endpoints require auth through existing route middleware

### 3. Build/update Graphify as logged runs

Best approach: do not make long HTTP calls wait. Use WebSocket/run pattern.

Create:

```txt
apps/bridge/src/ws/graphifyRun.ts
```

Route:

```txt
/ws/graphify-run?token=&projectId=&action=build|update|install
```

Actions:

- `install`: current install flow
- `build`: run graph generation command
- `update`: rerun graph generation command

Commands need local verification during implementation. Start conservative:

```txt
graphify
```

or if actual installed CLI needs subcommand, adapt after local smoke:

```txt
graphify analyze
graphify build
```

Important: discover command with:

```txt
graphify --help
```

Run persistence:

- create `agent_runs` row:
  - provider: `graphify`
  - mode: `graphify-build` / `graphify-update`
  - project_id
  - project_path
  - title: `Graphify build`
- write stdout/stderr chunks to `run_logs`
- on exit success:
  - refresh project Graphify status
- on exit failure:
  - mark status `failed`

### 4. Optional DB addition

Add lightweight events table only if needed:

```sql
CREATE TABLE graphify_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  run_id TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER
);
```

Recommendation: skip this table initially unless run-specific Graphify metadata becomes hard to query. `agent_runs.mode` is enough for Phase 3.

## Frontend Plan

### 1. Graphify API helpers

Create:

```txt
apps/dashboard/src/lib/graphify.ts
```

Functions:

- `loadGraphifyStatus(projectId)`
- `loadGraph(projectId)`
- `loadGraphifyReport(projectId)`
- `loadGraphifyHtml(projectId)`
- `connectGraphifyRun(projectId, action)`

### 2. Graphify panel

Create:

```txt
apps/dashboard/src/components/coding/GraphifyPanel.tsx
```

Sections:

- status card:
  - status badge
  - nodes / edges / communities
  - last updated
  - stale reason
- actions:
  - install
  - build
  - update
  - refresh status
  - open HTML preview
- run log area:
  - live graphify build output
  - link to run replay after completion

### 3. Native graph viewer

Create:

```txt
apps/dashboard/src/components/coding/GraphCanvas.tsx
```

Use D3 already installed.

Features:

- force-directed graph
- zoom/pan
- node colors by type/community
- hover label
- click node selects it
- stable dimensions so layout does not jump

Practical constraints:

- cap rendered nodes for performance if graph is large
- for first version render top 300 nodes by degree
- show message if graph is empty

### 4. Graph explorer sidebar

Create:

```txt
apps/dashboard/src/components/coding/GraphExplorer.tsx
```

Features:

- search nodes by label/path
- filter by type
- filter by community
- top connected files
- selected node details:
  - label
  - file path
  - type
  - community
  - connections
  - neighbors

### 5. Report viewer

Create:

```txt
apps/dashboard/src/components/coding/GraphReportViewer.tsx
```

Features:

- markdown-style plain rendering first
- tabs:
  - Report
  - Manifest
  - HTML Preview
- no unsafe script execution in inline HTML preview

Important:

- If using iframe with `srcDoc`, sandbox it:

```tsx
<iframe sandbox="" srcDoc={html} />
```

This prevents Graphify HTML scripts from executing unless explicitly allowed later.

### 6. Coding page integration

Update:

```txt
apps/dashboard/src/app/coding/page.tsx
```

Replace current small Graphify node chips section with:

- `GraphifyPanel`
- `GraphCanvas`
- `GraphExplorer`
- `GraphReportViewer`

Recommended layout:

```txt
Top: Project selector
Main left: Terminal + Run replay
Main right: Project summary + Run history
Graph section:
  left: GraphCanvas
  right: GraphifyPanel + GraphExplorer
  bottom: GraphReportViewer
```

## UI Acceptance Criteria

Phase 3 done when:

1. Active project shows Graphify status:
   - missing / partial / ready / stale / failed
2. Stale project shows `UPDATE GRAPH` action.
3. Missing project shows `INSTALL` or `BUILD GRAPH` action.
4. Existing project shows:
   - node count
   - edge count
   - community count
   - top connected nodes
5. Native graph canvas renders from `graph.json`.
6. User can search nodes.
7. User can click node and see details/neighbors.
8. `GRAPH_REPORT.md` is viewable inside dashboard.
9. `graph.html` can be previewed safely or opened.
10. Graphify build/update output is saved to Run History.

## Backend Acceptance Criteria

Phase 3 backend done when:

1. `GET /api/graphify/status` returns full status response.
2. `GET /api/graphify/report` returns markdown content.
3. `GET /api/graphify/html` returns HTML content if present.
4. `GET /api/graphify/manifest` returns JSON if present.
5. `GET /api/graphify/graph` remains backward compatible.
6. Graphify run creates `agent_runs` + `run_logs`.
7. Project row updates after Graphify build/update.

## Verification Plan

### Build verification

```txt
npm run build --workspace=apps/bridge
npm run build --workspace=apps/dashboard
```

### API smoke

With current project:

```txt
GET /api/graphify/status?projectId=<id>
GET /api/graphify/graph?projectId=<id>
GET /api/graphify/report?projectId=<id>
GET /api/graphify/html?projectId=<id>
GET /api/graphify/manifest?projectId=<id>
```

Expected current project:

- status likely `stale`
- graph nodes around 251
- edges around 320
- report exists
- html exists

### UI smoke

- open `/coding`
- select `agentic-os`
- Graphify status visible
- graph canvas non-empty
- search `coding`
- click a node
- open report tab
- refresh graph status
- run update if CLI command is confirmed

## Risks

### Graphify CLI command uncertainty

Risk: exact build/update command may differ by installed Graphify version.

Mitigation:

- first implementation should run `graphify --help` manually
- build runner should show command error cleanly
- keep install/build/update commands configurable later

### Large graph performance

Risk: D3 graph can slow browser.

Mitigation:

- cap first render to top 300 nodes
- show filters before rendering entire graph
- use stable SVG dimensions

### Unsafe HTML preview

Risk: `graph.html` may include scripts.

Mitigation:

- use sandboxed iframe or open external file route
- no privileged bridge tokens inside iframe

### Stale detection cost

Risk: recursively scanning huge projects is expensive.

Mitigation:

- ignore `node_modules`, `.git`, `.next`, `dist`, `build`, `coverage`, `graphify-out`
- reuse project scanner logic
- later cache source mtime summary

### UI bloat

Risk: `coding/page.tsx` becomes huge.

Mitigation:

- all Graphify UI must be separate components
- page only wires data/state

## Recommended Implementation Order

1. `graphifyManager.ts`
2. Expand `graphify.ts` endpoints
3. Add `graphifyRun.ts` WebSocket
4. Wire `/ws/graphify-run` in bridge index
5. Add dashboard `lib/graphify.ts`
6. Add `GraphifyPanel`
7. Add `GraphCanvas`
8. Add `GraphExplorer`
9. Add `GraphReportViewer`
10. Integrate into Coding page
11. Build + API smoke
12. UI smoke

## Next Phase After This

Phase 4 should be ECC Skills + Agents Catalog:

- scan installed ECC/user/project skills
- scan agents
- categorize daily/research/testing/security skills
- attach skills/agents to prompt templates
- show source path and target support: Claude/Codex

