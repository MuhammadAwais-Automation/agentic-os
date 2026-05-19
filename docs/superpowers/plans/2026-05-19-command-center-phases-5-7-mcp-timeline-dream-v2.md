# Command Center Phases 5-7 Plan

Date: 2026-05-19  
Project: `E:\Dashboard OS\agentic-os`  
Scope: Phase 5 MCP Manager, Phase 6 Agent Timeline + Approvals, Phase 7 Dream Engine v2

## 1. Planning Inputs

This plan builds on the completed Phase 1-4 foundation:

- Phase 1: live PTY terminal, `agent_runs`, `run_logs`, transcript persistence.
- Phase 2: project registry, active project context, run history/replay.
- Phase 3: Graphify manager, Graphify status, Graphify run logging.
- Phase 4: ECC catalog scanner, prompt attachments, catalog usage tracking.

Current implementation evidence:

- Backend route mounting lives in `apps/bridge/src/index.ts`.
- SQLite schema is inline in `apps/bridge/src/db.ts`.
- Terminal sessions are handled in `apps/bridge/src/ws/terminal.ts`.
- Graphify runs are handled in `apps/bridge/src/ws/graphifyRun.ts`.
- Run history APIs are in `apps/bridge/src/routes/runs.ts`.
- Catalog scanner pattern is in `apps/bridge/src/services/catalogScanner.ts`.
- Dream v1 is in `apps/bridge/src/services/dreamEngine.ts`.
- Dashboard fetch helpers live in `apps/dashboard/src/lib`.
- Command Center UI is `apps/dashboard/src/app/coding/page.tsx`.
- Reusable coding components are under `apps/dashboard/src/components/coding`.
- Catalog manager UI is the best existing manager-page pattern.

## 2. Product Direction

Phase 5-7 should turn the Command Center from "run terminal + inspect graph/catalog" into an operational control layer:

1. Phase 5: show which external tool servers are configured and whether they are usable.
2. Phase 6: explain what agents are doing in real time, not just raw stdout.
3. Phase 7: convert all captured evidence into recommendations with clear proof and ROI.

Important boundary:

- Phase 5 health checks must be read-only.
- Secrets must never be displayed.
- Approvals UI should represent pending decisions safely; it should not auto-approve remote or destructive actions.
- Dream recommendations should suggest and explain; execution remains explicit user action.

## 3. Phase 5: MCP Manager

### 3.1 Goal

Give visibility into user-level, project-level, and ECC-recommended MCP servers:

- what is configured
- where it comes from
- what is missing
- whether required environment variables are present
- whether config has drifted from ECC recommendations
- whether read-only health checks pass

### 3.2 Current Gap

There is no MCP backend or UI yet:

- no `apps/bridge/src/services/mcpScanner.ts`
- no `apps/bridge/src/routes/mcp.ts`
- no `apps/dashboard/src/lib/mcp.ts`
- no `/mcp` route
- no MCP tables

The repo also currently has no project `.codex/config.toml` or `mcp-configs` directory visible in the working tree, so the scanner must tolerate missing files cleanly.

### 3.3 Config Sources To Scan

Scan these sources in this order:

1. User Codex config: `%USERPROFILE%\.codex\config.toml`
2. Project Codex config: `<projectPath>\.codex\config.toml`
3. Project MCP JSON: `<projectPath>\.mcp.json`
4. User Claude MCP config candidates:
   - `%APPDATA%\Claude\claude_desktop_config.json`
   - `%USERPROFILE%\.claude\mcp.json`
5. ECC catalog/recommendation sources if present:
   - `<repo>\mcp-configs`
   - `<repo>\.codex\config.toml`
   - installed ECC/plugin folders under user home when detectable

### 3.4 Backend Data Model

Add tables in `apps/bridge/src/db.ts`:

```sql
CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  scope TEXT NOT NULL,
  project_id TEXT,
  project_path TEXT,
  command TEXT,
  args TEXT,
  env_keys TEXT,
  required_env_keys TEXT,
  status TEXT NOT NULL,
  drift_status TEXT NOT NULL DEFAULT 'unknown',
  config_path TEXT,
  last_seen_at INTEGER NOT NULL,
  last_checked_at INTEGER,
  health_message TEXT
);

CREATE TABLE IF NOT EXISTS mcp_health_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT NOT NULL,
  checked_at INTEGER NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  duration_ms INTEGER,
  FOREIGN KEY (server_id) REFERENCES mcp_servers(id)
);
```

Keep this metadata-only. Do not store env values.

### 3.5 Backend Service

Create `apps/bridge/src/services/mcpScanner.ts`.

Core types:

```ts
type McpScope = 'user' | 'project' | 'ecc'
type McpStatus = 'configured' | 'missing_env' | 'missing_config' | 'invalid_config' | 'healthy' | 'unhealthy'
type McpDriftStatus = 'matches' | 'missing' | 'extra' | 'changed' | 'unknown'

interface McpServerRecord {
  id: string
  name: string
  source: string
  scope: McpScope
  projectId: string | null
  projectPath: string | null
  command: string | null
  args: string[]
  envKeys: string[]
  requiredEnvKeys: string[]
  missingEnvKeys: string[]
  status: McpStatus
  driftStatus: McpDriftStatus
  configPath: string | null
  healthMessage: string | null
  lastSeenAt: number
  lastCheckedAt: number | null
}
```

Implementation details:

- Use a TOML parser dependency or a small isolated parser wrapper. Prefer adding a maintained parser dependency for correctness.
- Parse only known MCP sections: `[mcp_servers.<name>]` and legacy aliases like `[mcpServers.<name>]` only if needed.
- For JSON configs, parse `mcpServers` safely.
- Normalize all configs into the same shape.
- Compute stable IDs from `scope + source + projectPath + serverName`.
- Redact env values by only returning names and presence booleans.
- Mark missing env when config references env keys that are absent from `process.env`.
- Detect drift by comparing ECC-recommended command/args/env key names against actual config, not secret values.
- Health checks should be optional and read-only:
  - config parse check
  - executable resolution check for command names where cheap
  - no starting long-running MCP server by default
  - no network calls unless explicitly allowed later

### 3.6 Backend Routes

Create `apps/bridge/src/routes/mcp.ts` and mount it in `apps/bridge/src/index.ts`:

```ts
app.use('/api/mcp', authMiddleware, mcpRouter)
```

Routes:

- `GET /api/mcp/servers?projectId=...`
  - returns user + ECC + active project MCP server records
- `POST /api/mcp/refresh`
  - body: `{ projectId?: string }`
  - rescans and upserts metadata
- `POST /api/mcp/check`
  - body: `{ serverId: string }`
  - runs safe read-only health check
- `GET /api/mcp/summary?projectId=...`
  - returns counts by status, source, scope, drift

### 3.7 Frontend UI

Create:

- `apps/dashboard/src/lib/mcp.ts`
- `apps/dashboard/src/app/mcp/page.tsx`
- `apps/dashboard/src/components/mcp/McpToolbar.tsx`
- `apps/dashboard/src/components/mcp/McpSummary.tsx`
- `apps/dashboard/src/components/mcp/McpServerList.tsx`
- `apps/dashboard/src/components/mcp/McpServerDetail.tsx`
- `apps/dashboard/src/components/mcp/McpEnvWarnings.tsx`
- add nav item in `apps/dashboard/src/components/layout/Sidebar.tsx`

Use the existing Catalog page as the layout precedent:

- top toolbar: project selector, refresh, scope filter, status filter
- summary cards: total, healthy, missing env, drift, invalid
- left column: server list
- center column: selected server detail
- right column: missing env/drift warnings

UI should show:

- server name
- scope: user/project/ECC
- config path
- command and args with safe display
- env key names only
- missing env key names only
- drift explanation
- last scanned/checked timestamp
- health status

UI must not show:

- env values
- credentials
- token-like substrings from config

### 3.8 Phase 5 Acceptance

Phase 5 is done when:

- `/mcp` route appears in sidebar.
- MCP servers from user/project config are listed when present.
- Missing config states are graceful, not errors.
- Missing env warnings show env names only.
- ECC drift is visible when recommendations exist.
- Refresh works.
- Safe health check works for at least parse/executable checks.
- Build passes.

## 4. Phase 6: Agent Timeline + Approvals

### 4.1 Goal

Show live structured agent activity:

- what started
- what command is running
- what output category occurred
- whether approval seems needed
- what files changed
- whether run succeeded, failed, or was cancelled
- replay timeline from history

### 4.2 Current Gap

Current run storage is raw:

- `agent_runs` stores run metadata.
- `run_logs` stores raw stdout/stderr/stdin/system chunks.
- `RunReplay` joins logs back into a transcript.

Missing:

- no normalized event model
- no approval queue
- no file-change summary
- no live event WebSocket messages
- one-shot Claude/Codex runs are not persisted

### 4.3 Backend Data Model

Add tables:

```sql
CREATE TABLE IF NOT EXISTS run_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  detail TEXT,
  metadata TEXT,
  FOREIGN KEY (run_id) REFERENCES agent_runs(id)
);

CREATE TABLE IF NOT EXISTS run_approvals (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_at INTEGER NOT NULL,
  resolved_at INTEGER,
  title TEXT NOT NULL,
  detail TEXT,
  risk_level TEXT NOT NULL DEFAULT 'unknown',
  action_kind TEXT,
  metadata TEXT,
  FOREIGN KEY (run_id) REFERENCES agent_runs(id)
);

CREATE TABLE IF NOT EXISTS run_file_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  path TEXT NOT NULL,
  change_kind TEXT NOT NULL,
  detected_at INTEGER NOT NULL,
  additions INTEGER,
  deletions INTEGER,
  metadata TEXT,
  FOREIGN KEY (run_id) REFERENCES agent_runs(id)
);
```

### 4.4 Backend Event Pipeline

Create `apps/bridge/src/services/runEventParser.ts`.

It should expose:

```ts
function ingestRunChunk(input: {
  runId: string
  stream: string
  data: string
  ts: number
}): RunEvent[]
```

First version should use conservative pattern matching:

- run started: system `[started ...]`
- command output: normal stdout grouping
- error output: stderr or known error words
- approval likely: output includes approval prompts or permission language
- tool/action likely: output includes file edit, command run, install, build, test
- run exit: system `[exited with code X]`
- cancellation: system `[cancelled by client]`

Do not overfit to one provider. Store raw evidence in `metadata`.

Update log producers:

- `apps/bridge/src/ws/terminal.ts`
- `apps/bridge/src/ws/graphifyRun.ts`
- later: `apps/bridge/src/ws/claude.ts` and `apps/bridge/src/ws/codex.ts`

Each time a log chunk is written:

1. insert into `run_logs`
2. parse into events
3. insert events into `run_events`
4. send event payload over WebSocket if a live client is connected

### 4.5 Approval Queue

Important practical note: PTY-based Claude/Codex approval prompts are interactive text, not structured API calls. Phase 6 should start by detecting and surfacing likely approvals, not by claiming full programmatic approval control.

Approval v1:

- detect likely approval prompts from output
- create `run_approvals` row with `status='pending'`
- UI shows prompt and links to active terminal
- user responds in terminal manually
- UI allows marking as `resolved`, `dismissed`, or `blocked`

Approval v2 later:

- if provider exposes structured approval protocol, wire approve/deny actions to stdin or native API.

Routes:

- `GET /api/runs/:id/events`
- `GET /api/runs/:id/file-changes`
- `GET /api/approvals?status=pending`
- `PATCH /api/approvals/:id`

### 4.6 File Change Summary

Start simple and local:

- On run start, capture `git status --porcelain` snapshot if cwd is a git repo.
- On run exit/cancel, capture another snapshot.
- Diff the two lists into `run_file_changes`.
- For tracked text diffs, optionally capture additions/deletions via `git diff --numstat`.

Do not store file contents. Store path and counts only.

Implementation touchpoints:

- Add helper in `apps/bridge/src/services/gitChangeTracker.ts`.
- Call it from `terminal.ts` and `graphifyRun.ts`.
- For non-git projects, skip gracefully.

### 4.7 Frontend UI

Create:

- `apps/dashboard/src/lib/approvals.ts`
- extend `apps/dashboard/src/lib/runs.ts` with events/file changes
- `apps/dashboard/src/components/coding/AgentTimeline.tsx`
- `apps/dashboard/src/components/coding/ApprovalQueuePanel.tsx`
- `apps/dashboard/src/components/coding/FileChangeSummary.tsx`
- enhance `RunReplay.tsx` with tabs: transcript, timeline, files

Update `apps/dashboard/src/app/coding/page.tsx`:

- Keep terminal center stage.
- Add timeline panel next to or below terminal.
- Add approval queue in right column or bottom drawer.
- Run history selection should load replay timeline and files.

Suggested layout:

- Left/center: terminal
- Right top: active timeline
- Right middle: pending approvals
- Bottom/replay: transcript, timeline, file changes

### 4.8 Phase 6 Acceptance

Phase 6 is done when:

- Live terminal runs emit timeline events.
- Graphify runs emit timeline events.
- Run replay can show transcript and timeline.
- Approval-like prompts appear in pending approvals.
- User can mark approval items resolved/dismissed.
- File-change summary appears after git-backed runs.
- Raw logs remain available.
- Existing terminal and run history still work.

## 5. Phase 7: Dream Engine v2

### 5.1 Goal

Turn captured evidence into actionable recommendations:

- repeated tasks
- stale graphs/memory
- failed or flaky workflows
- unused or useful skills
- MCP configuration problems
- expensive or inefficient model/provider use
- automation opportunities
- ROI/time-saved estimates

### 5.2 Current Gap

Dream v1 is narrow:

- reads Claude history
- checks Claude memory folder staleness
- checks missing Graphify folders under `projectsBasePath`

It does not use:

- `agent_runs`
- `run_logs`
- `run_events`
- `run_file_changes`
- `catalog_usage`
- `prompt_attachments`
- `sessions`
- project Graphify status
- MCP health

### 5.3 Backend Data Model

Existing `insights` table is too small for evidence-backed v2. Add columns or create a richer table. Prefer additive columns for compatibility:

```sql
ALTER TABLE insights ADD COLUMN project_id TEXT;
ALTER TABLE insights ADD COLUMN severity TEXT DEFAULT 'info';
ALTER TABLE insights ADD COLUMN evidence TEXT;
ALTER TABLE insights ADD COLUMN action_kind TEXT;
ALTER TABLE insights ADD COLUMN action_payload TEXT;
ALTER TABLE insights ADD COLUMN confidence REAL DEFAULT 0.5;
```

If additive migration becomes messy, create `dream_insights_v2` and keep existing route response backward-compatible.

### 5.4 Dream Analyzer Modules

Refactor `apps/bridge/src/services/dreamEngine.ts` into smaller analyzers:

- `analyzeRepeatedTasks`
- `analyzeFailedRuns`
- `analyzeGraphifyFreshness`
- `analyzeCatalogUsage`
- `analyzeSkillOpportunities`
- `analyzeMcpHealth`
- `analyzeSessionCostAndQuota`
- `analyzeMemoryFreshness`

Each analyzer returns:

```ts
interface DreamRecommendation {
  type: 'skill' | 'automation' | 'mcp' | 'memory' | 'graphify' | 'model' | 'quality'
  title: string
  reason: string
  roi: string
  severity: 'info' | 'warning' | 'critical'
  confidence: number
  projectId: string | null
  evidence: Array<{
    kind: 'run' | 'session' | 'catalog' | 'graphify' | 'mcp' | 'memory'
    id?: string
    label: string
    value?: string
  }>
  actionKind?: 'create_skill' | 'refresh_graphify' | 'fix_mcp_env' | 'review_failed_run' | 'refresh_memory'
  actionPayload?: Record<string, unknown>
}
```

### 5.5 Recommendation Rules

Initial v2 rules:

1. Repeated terminal commands
   - Find repeated stdin commands or prompt patterns across recent `run_logs`.
   - Recommend skill/command automation after 3+ similar occurrences.

2. Failed runs
   - Find runs with `status='error'` or non-zero `exit_code`.
   - Group by project/provider/command.
   - Recommend adding troubleshooting automation or tests.

3. Stale Graphify
   - Use `projects.graphify_status`, `graphify_updated_at`, `graphify_last_error`.
   - Recommend refresh or repair.

4. Unused attached skills
   - Compare `prompt_attachments` with `catalog_usage`.
   - Recommend removing stale attachments or surfacing high-value ones.

5. Skill opportunity
   - Repeated prompts/runs without related catalog item usage.
   - Recommend creating or attaching a skill.

6. MCP health
   - Use Phase 5 `mcp_servers`.
   - Recommend fixing missing env/drift/unhealthy servers.

7. Model/provider efficiency
   - Use `sessions` and `agent_runs`.
   - Recommend cheaper provider/model for small repeated tasks when evidence exists.

8. Memory freshness
   - Keep existing stale memory check but include file path labels and age.

### 5.6 Dream Routes

Extend `apps/bridge/src/routes/dream.ts`:

- `GET /api/dream/insights?projectId=&status=&type=`
- `POST /api/dream/run`
  - body: `{ projectId?: string, scope?: 'global' | 'project' }`
- `GET /api/dream/summary`
- `PATCH /api/dream/insights/:id`

Keep existing route shapes backward-compatible for current UI.

### 5.7 Frontend UI

Enhance existing `apps/dashboard/src/app/dream/page.tsx` instead of creating a new route.

Create:

- `apps/dashboard/src/lib/dream.ts`
- `apps/dashboard/src/components/dream/DreamToolbar.tsx`
- `apps/dashboard/src/components/dream/DreamSummary.tsx`
- `apps/dashboard/src/components/dream/DreamInsightList.tsx`
- `apps/dashboard/src/components/dream/DreamInsightDetail.tsx`
- `apps/dashboard/src/components/dream/DreamEvidenceList.tsx`

UI changes:

- Project/global scope selector.
- Filters by type, severity, status.
- Summary metrics: pending, critical, estimated weekly time saved, stale items.
- Insight detail panel with evidence links.
- Action buttons:
  - mark applied
  - skip
  - open related run
  - open catalog item
  - open MCP server
  - open Graphify project

### 5.8 Phase 7 Acceptance

Phase 7 is done when:

- Dream uses DB evidence from runs, sessions, catalog, Graphify, and MCP.
- Recommendations include evidence, confidence, severity, and ROI.
- Dream page can filter and inspect recommendation evidence.
- Recommendations link back to related run/project/catalog/MCP where possible.
- Existing nightly schedule still works.
- Manual `RUN NOW` works for global and project scope.

## 6. Recommended Implementation Order

### Phase 5 Order

1. Add MCP DB tables.
2. Add TOML/JSON parsing utility.
3. Create `mcpScanner.ts`.
4. Add `mcp.ts` routes.
5. Mount routes in bridge index.
6. Add dashboard `lib/mcp.ts`.
7. Add `/mcp` page and sidebar item.
8. Add MCP list/detail/warnings components.
9. Add safe health check action.
10. Build and smoke test.

### Phase 6 Order

1. Add `run_events`, `run_approvals`, `run_file_changes`.
2. Add `runEventParser.ts`.
3. Add shared `persistRunLogAndEvents` helper.
4. Wire helper into `terminal.ts`.
5. Wire helper into `graphifyRun.ts`.
6. Add event/approval/file routes.
7. Add git snapshot/file-change tracker.
8. Add dashboard event types in `lib/runs.ts`.
9. Add `AgentTimeline`, `ApprovalQueuePanel`, `FileChangeSummary`.
10. Upgrade `RunReplay` tabs.
11. Smoke test live and replay flows.

### Phase 7 Order

1. Add v2 insight columns.
2. Add typed Dream recommendation model.
3. Refactor Dream engine into analyzer functions.
4. Implement repeated task + failed run analyzers.
5. Implement Graphify + catalog analyzers.
6. Implement MCP analyzer after Phase 5 data exists.
7. Implement session/model + memory analyzers.
8. Extend Dream routes with filters/summaries.
9. Add dashboard `lib/dream.ts`.
10. Upgrade Dream UI with filters/detail/evidence.
11. Run global and project Dream v2 smoke tests.

## 7. Testing And Verification

Backend:

- `npm run build --workspace=apps/bridge`
- API smoke:
  - `/api/mcp/summary`
  - `/api/mcp/servers`
  - `/api/runs/:id/events`
  - `/api/approvals`
  - `/api/dream/insights`
- Run a short PowerShell terminal session and verify logs/events.
- Run Graphify action and verify logs/events.
- Verify no env values are returned by MCP APIs.

Frontend:

- `npm run build --workspace=apps/dashboard`
- Manual browser checks:
  - `/mcp` loads without config files.
  - `/mcp` shows missing env names only.
  - `/coding` terminal still starts.
  - `/coding` timeline updates.
  - run replay transcript/timeline/files load.
  - `/dream` run now produces evidence-backed insights.

Security checks:

- Search API responses and rendered UI for token-like values.
- Confirm MCP scanner never reads `.env` file contents.
- Confirm health checks are read-only.
- Confirm approval UI does not auto-execute remote actions.

## 8. Main Risks

### MCP TOML parsing

Risk: ad hoc parsing breaks on nested TOML.  
Mitigation: use a maintained TOML parser or isolate parser behind tests.

### Secret leakage

Risk: MCP env values or credentials get displayed.  
Mitigation: store and return env key names only; never include values in records, logs, or UI.

### Approval semantics

Risk: UI implies it can safely approve actions when the provider only exposes text prompts.  
Mitigation: Phase 6 v1 says "approval likely" and links user to terminal; explicit manual resolution only.

### Timeline noise

Risk: raw output generates too many low-value events.  
Mitigation: group chunks, dedupe repetitive event types, always keep raw transcript separate.

### Dream recommendation quality

Risk: recommendations feel generic.  
Mitigation: every insight must include evidence rows and confidence; weak evidence should not produce high severity.

## 9. Definition Of Done For All Three Phases

The combined Phase 5-7 milestone is complete when:

- MCP servers are visible with safe status and env warnings.
- Agent runs have structured live and replayable timelines.
- Approval-like moments are surfaced without unsafe automation.
- File-change summaries exist for git-backed runs.
- Dream Engine v2 produces evidence-backed recommendations from runs, sessions, catalog, Graphify, MCP, and memory.
- All new APIs are authenticated.
- No secrets are displayed.
- Bridge and dashboard builds pass.
