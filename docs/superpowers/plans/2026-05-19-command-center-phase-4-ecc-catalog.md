# Command Center Phase 4 Plan: ECC Catalog

Date: 2026-05-19
Project: `E:\Dashboard OS\agentic-os`
Planner mode: Phase plan only, no implementation.

## Goal

Phase 4 ka goal ECC skills, agents, commands, aur rules ko dashboard ke andar first-class catalog banana hai. Phase 2 ne project registry aur run history di, Phase 3 ne Graphify ko project brain banaya. Ab Phase 4 me user ko yeh dekhna chahiye:

- kaun se skills installed hain
- kaun se agents available hain
- commands/rules kis source se aa rahe hain
- kis skill/agent ko prompt runner ke sath attach karna hai
- daily coding, testing, security, research, aur agent-os workflows ke liye best shortcuts

Short version: ECC ko hidden folder bundle se visible cockpit controls banana.

## Current State

Existing app has:

- project registry
- run history
- terminal runner
- Graphify manager
- dream insights that can suggest skill creation

Missing:

- no skills scanner
- no agents scanner
- no commands/rules catalog
- no `/api/catalog/*` endpoints
- no Skills/Agents page
- no prompt attachment model
- no usage tracking for skills/agents

## Scope

### In Scope

- scan user-level and project-level ECC/Codex/Claude skills
- scan agents from known user/project locations
- scan command/rule metadata where present
- parse `SKILL.md` frontmatter and first heading/description fallback
- parse agent yaml/toml/markdown metadata where present
- store catalog entries in SQLite
- expose list/detail/refresh APIs
- add Catalog page with Skills and Agents tabs
- allow filtering by category, source, target, project relevance
- allow attaching a skill/agent to a prompt draft
- show file path and source type

### Out Of Scope

- installing new skills from marketplace
- editing skill files from UI
- publishing skills
- remote agent dispatch
- automatic skill generation
- MCP manager
- full prompt-template system beyond lightweight draft attachment

## Backend Plan

### 1. Add catalog database tables

Update:

```txt
apps/bridge/src/db.ts
```

Add tables:

```sql
CREATE TABLE catalog_items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  project_id TEXT,
  project_path TEXT,
  tags TEXT,
  installed_for_claude INTEGER NOT NULL DEFAULT 0,
  installed_for_codex INTEGER NOT NULL DEFAULT 0,
  last_seen_at INTEGER NOT NULL,
  last_used_at INTEGER
);

CREATE TABLE catalog_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  run_id TEXT,
  project_id TEXT,
  project_path TEXT,
  used_at INTEGER NOT NULL,
  FOREIGN KEY (item_id) REFERENCES catalog_items(id)
);

CREATE TABLE prompt_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT,
  item_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (item_id) REFERENCES catalog_items(id)
);
```

Use one `catalog_items` table instead of separate `skills`, `agents`, `commands`, `rules` tables. This keeps the UI simple and lets filters work across all workflow surfaces.

`kind` values:

- `skill`
- `agent`
- `command`
- `rule`

`source` values:

- `user-agents`
- `user-claude`
- `user-codex`
- `project-agents`
- `project-claude`
- `project-codex`
- `ecc`
- `unknown`

`target` values:

- `claude`
- `codex`
- `both`
- `generic`

### 2. Create catalog scanner service

Create:

```txt
apps/bridge/src/services/catalogScanner.ts
```

Responsibilities:

- resolve home directory safely
- scan fixed known locations
- scan active project locations
- ignore heavy folders:
  - `node_modules`
  - `.git`
  - `.next`
  - `dist`
  - `build`
  - `coverage`
  - `graphify-out`
- parse `SKILL.md`
- parse `.yaml`, `.yml`, `.toml`, `.md` agent files
- parse commands/rules as lightweight metadata
- categorize items
- upsert into `catalog_items`
- mark stale items by absence on refresh

Known skill locations:

```txt
~/.agents/skills
~/.claude/skills
~/.claude/plugins/marketplaces/ecc/skills
~/.claude/plugins/marketplaces/ecc/.agents/skills
~/.codex/skills
~/.codex/prompts
<project>/.agents/skills
<project>/.claude/skills
```

Known agent locations:

```txt
~/.claude/agents
~/.codex/agents
~/.agents/agents
<project>/.agents
<project>/.codex/agents
<project>/.claude/agents
```

Known command/rule locations:

```txt
~/.agents/commands
~/.agents/rules
~/.claude/commands
<project>/commands
<project>/rules
<project>/.agents/commands
<project>/.agents/rules
```

Metadata extraction:

- YAML frontmatter:
  - `name`
  - `description`
  - `category`
  - `tags`
  - `target`
- fallback name from folder/file stem
- fallback description from first non-heading paragraph
- category inferred from name/description/path

Category inference:

- `testing`: tdd, test, playwright, e2e, regression
- `security`: security, auth, secret, vuln
- `frontend`: react, next, ui, css, design
- `backend`: api, database, server, backend
- `research`: research, market, article, docs
- `agent-os`: graphify, memory, compact, learning, introspection
- `workflow`: commit, review, plan, orchestration
- `utility`: default

### 3. Add catalog routes

Create:

```txt
apps/bridge/src/routes/catalog.ts
```

Endpoints:

```txt
GET  /api/catalog/items?kind=&category=&source=&target=&q=&projectId=
GET  /api/catalog/items/:id
POST /api/catalog/refresh
POST /api/catalog/usage
GET  /api/catalog/summary?projectId=
POST /api/catalog/attachments
GET  /api/catalog/attachments?projectId=
DELETE /api/catalog/attachments/:id
```

Response behavior:

- `refresh` scans user-level sources and optional `projectId`
- `items` returns filtered catalog entries
- `summary` returns counts by kind/category/source/target
- `usage` records manual usage or prompt attachment usage
- `attachments` stores selected skills/agents for the current prompt context

Wire route in:

```txt
apps/bridge/src/index.ts
```

as:

```txt
app.use('/api/catalog', authMiddleware, catalogRouter)
```

### 4. Security boundaries

Catalog scanner reads local metadata only.

Rules:

- never execute scanned files
- never install or modify skills
- never read hidden secrets or env files
- never expose full file content by default
- expose path, metadata, and short preview only
- detail endpoint may return `readmePreview` capped to 8 KB
- block paths outside allowed scan roots

## Frontend Plan

### 1. Catalog API helpers

Create:

```txt
apps/dashboard/src/lib/catalog.ts
```

Functions:

- `listCatalogItems(filters)`
- `loadCatalogItem(id)`
- `refreshCatalog(projectId?)`
- `loadCatalogSummary(projectId?)`
- `recordCatalogUsage(itemId, projectId?, runId?)`
- `listPromptAttachments(projectId?)`
- `attachCatalogItem(itemId, projectId?)`
- `removeCatalogAttachment(id)`

Types:

```ts
type CatalogKind = 'skill' | 'agent' | 'command' | 'rule'
type CatalogTarget = 'claude' | 'codex' | 'both' | 'generic'

interface CatalogItem {
  id: string
  kind: CatalogKind
  name: string
  description: string | null
  category: string | null
  source: string
  target: CatalogTarget
  path: string
  projectId: string | null
  projectPath: string | null
  tags: string[]
  installedForClaude: boolean
  installedForCodex: boolean
  lastSeenAt: number
  lastUsedAt: number | null
}
```

### 2. Add Catalog page

Create:

```txt
apps/dashboard/src/app/catalog/page.tsx
```

Add sidebar route:

```txt
apps/dashboard/src/components/layout/Sidebar.tsx
```

New nav item:

```txt
{ href: '/catalog', label: 'TOOLS', icon: '...' }
```

Use a simple icon that already matches current visual language.

### 3. Catalog components

Create:

```txt
apps/dashboard/src/components/catalog/CatalogToolbar.tsx
apps/dashboard/src/components/catalog/CatalogSummary.tsx
apps/dashboard/src/components/catalog/CatalogItemList.tsx
apps/dashboard/src/components/catalog/CatalogItemDetail.tsx
apps/dashboard/src/components/catalog/PromptAttachmentPanel.tsx
```

Component responsibilities:

- `CatalogToolbar`
  - search
  - kind filter
  - category filter
  - source filter
  - target filter
  - refresh button
- `CatalogSummary`
  - total skills/agents/commands/rules
  - Codex-ready count
  - Claude-ready count
  - project-local count
- `CatalogItemList`
  - dense list of catalog items
  - badges for kind/category/target/source
  - last seen/last used
- `CatalogItemDetail`
  - description
  - path
  - tags
  - source/target
  - preview
  - attach button
- `PromptAttachmentPanel`
  - selected skills/agents for active project
  - generated prompt context snippet
  - remove attachment

### 4. Prompt runner integration

Update:

```txt
apps/dashboard/src/app/coding/page.tsx
```

Minimal Phase 4 integration:

- load prompt attachments for active project
- show attached skills/agents above one-shot prompt
- when user runs Claude/Codex prompt, prepend a short local context block:

```txt
Use these selected workflow helpers if relevant:
- skill: tdd-workflow
- skill: verification-loop
- agent: code-reviewer
```

Important:

- attachment is advisory text only
- no remote agent dispatch
- no external action

### 5. Daily/high-priority surfacing

Default recommended catalog section:

- `tdd-workflow`
- `verification-loop`
- `frontend-patterns`
- `backend-patterns`
- `api-design`
- `security-review`
- `e2e-testing`
- `coding-standards`
- `graphify`
- `agent-introspection-debugging`
- `continuous-learning-v2`
- `strategic-compact`
- `skill-stocktake`
- `configure-ecc`

If item is installed, show as available.
If missing, show as not found without trying to install.

## UI Layout

Recommended `/catalog` layout:

```txt
Top: title + refresh catalog
Band: summary counters
Main:
  left: filters + item list
  right: selected item detail
Bottom/right: prompt attachments panel
```

Keep it operational, not marketing-style. The user is managing a capability library, so density and scanning matter more than decorative cards.

## Acceptance Criteria

Phase 4 done when:

1. Catalog refresh scans user-level and project-level sources.
2. Skills appear with name, description, source, path, category, and target.
3. Agents appear with name, description/source/path/category where available.
4. Commands/rules appear as lightweight entries.
5. User can filter by kind, category, source, target, and search text.
6. User can select an item and see details.
7. User can attach a skill/agent to active project prompt context.
8. Attached items show in Coding page prompt runner.
9. Prompt run records usage for attached items.
10. Build passes for bridge and dashboard.

## Backend Acceptance Criteria

1. `POST /api/catalog/refresh` upserts catalog entries.
2. `GET /api/catalog/items` returns filtered entries.
3. `GET /api/catalog/items/:id` returns detail with capped preview.
4. `GET /api/catalog/summary` returns counts.
5. `POST /api/catalog/attachments` creates prompt attachment.
6. `GET /api/catalog/attachments` lists project/global attachments.
7. `DELETE /api/catalog/attachments/:id` removes attachment.
8. Scanner does not execute or mutate scanned files.

## Verification Plan

### Build verification

```txt
npm run build --workspace=apps/bridge
npm run build --workspace=apps/dashboard
```

### API smoke

With current project:

```txt
POST /api/catalog/refresh
GET  /api/catalog/summary
GET  /api/catalog/items?kind=skill
GET  /api/catalog/items?kind=agent
GET  /api/catalog/items?q=graphify
POST /api/catalog/attachments
GET  /api/catalog/attachments?projectId=<id>
```

Expected:

- installed local/user skills are visible
- project-local entries appear if folders exist
- no error if a scan root is missing
- search for `graphify` returns graphify-related skill(s) if installed

### UI smoke

- open `/catalog`
- refresh catalog
- switch Skills/Agents filters
- search `graphify`
- search `security`
- select one item
- attach item to active project
- open `/coding`
- attached item appears near one-shot prompt
- run prompt and usage records

## Risks

### Metadata inconsistency

Risk: skills and agents do not all use the same metadata format.

Mitigation:

- parse frontmatter when present
- use folder/file stem fallback
- use first paragraph fallback for description
- categorize heuristically

### Huge user-level ECC install

Risk: scanning hundreds of skills can slow API.

Mitigation:

- metadata-only scan
- ignore heavy dirs
- cap previews
- refresh on demand only
- later add background refresh

### Path privacy

Risk: UI exposes sensitive absolute paths.

Mitigation:

- only authenticated routes
- show full path because this is a local dashboard
- never expose file contents except capped preview
- do not scan secret/env files

### Prompt attachment ambiguity

Risk: “attach skill” might imply the runner actually loads the skill.

Mitigation:

- Phase 4 attachment is explicit prompt context only
- UI copy should say “attached to prompt context”
- real skill execution/installation is later scope

### UI bloat

Risk: Catalog page becomes too much at once.

Mitigation:

- create small catalog components
- keep `/catalog/page.tsx` as state wiring only
- reuse existing Badge/GlowCard visual system

## Recommended Implementation Order

1. Add DB tables/migrations.
2. Create `catalogScanner.ts`.
3. Add `catalog.ts` routes.
4. Wire routes in bridge index.
5. Add dashboard `lib/catalog.ts`.
6. Add `/catalog` page and sidebar nav item.
7. Add catalog toolbar/list/detail/summary components.
8. Add prompt attachment panel.
9. Integrate attachments into Coding page prompt runner.
10. Record usage when prompt runs.
11. Build verification.
12. API smoke.
13. UI smoke.
14. Run graphify update after implementation.

## Next Phase After This

Phase 5 should be MCP Manager:

- parse `.codex/config.toml`
- show enabled MCP servers
- show missing/drift status
- run safe read-only health checks
- expose project-local vs user-level MCP config differences
