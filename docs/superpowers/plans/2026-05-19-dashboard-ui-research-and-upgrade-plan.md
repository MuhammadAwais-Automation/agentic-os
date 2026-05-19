# Dashboard UI Research And Upgrade Plan

Date: 2026-05-19  
Project: `E:\Dashboard OS\agentic-os`  
Skill used: `C:\Users\Ethical Byte\.codex\skills\frontend-design\SKILL.md`

## 1. Goal

Upgrade Agentic OS from a dark card dashboard into a production-grade AI coding command center.

The UI should feel like an operational cockpit for local agents:

- fast to scan
- keyboard-friendly
- dense but readable
- visually distinctive
- responsive enough for laptop/tablet/mobile inspection
- explicit about agent status, approvals, risk, cost, context, and evidence

This is not a landing page redesign. The first screen should remain a usable app surface.

## 2. Research Signals

### Developer command centers

Linear's docs emphasize that actions should be available through multiple paths: buttons, contextual menus, keyboard shortcuts, and command menu. This fits Agentic OS because agent workflows should be reachable from anywhere, not buried in one page.

Source: https://linear.app/docs/conceptual-model

Key takeaway for Agentic OS:

- Add a global command palette.
- Keep primary actions visible, but also make them searchable.
- Build consistent action naming and categories.
- Support muscle memory: project, run, graph, skill, MCP, approval, dream actions.

### AI coding agent transparency

GitHub Copilot cloud agent docs frame agent work as research, planning, code changes, review, and pull-request iteration. They also emphasize transparency: logs, commits, branch work, and review before final action.

Source: https://docs.github.com/en/copilot/using-github-copilot/coding-agent/about-assigning-tasks-to-copilot

Key takeaway for Agentic OS:

- Command Center needs a visible agent timeline.
- User should see plan, commands, file changes, tests, errors, and approvals.
- Agent work should have replayable evidence.
- UI should distinguish local synchronous terminal work from background/delegated work.

### Observability dashboard strategy

Grafana dashboard guidance says dashboards should answer clear questions, reduce cognitive load, and follow a monitoring strategy such as RED/USE/Four Golden Signals.

Source: https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/

Key takeaway for Agentic OS:

- Home should not be a random metric wall.
- Use an AI-ops monitoring model:
  - Rate: runs/sessions/tasks today
  - Errors: failed runs, broken MCP, stale Graphify
  - Duration: run time, time-to-fix, session duration
  - Saturation: quota/limits/cost/context pressure
- Show "what needs attention" first.

### Color semantics and accessibility

Atlassian color guidance separates neutral, brand, information, success, warning, danger, discovery, and interaction-state roles. It also points to WCAG contrast requirements.

Source: https://atlassian.design/foundations/color

Key takeaway for Agentic OS:

- Current amber/teal/purple theme is expressive but needs semantic roles.
- Do not use accent colors only for decoration.
- Reserve red for danger, amber for caution/pending, teal/green for healthy/success, blue/cyan for information/active, purple for discovery/AI insight.
- Improve muted text contrast.

### Empty states

Atlassian and Grafana both define empty states as places to explain what is missing and what the user can do next.

Sources:

- https://atlassian.design/components/empty-state
- https://grafana.com/developers/saga/patterns/empty-state/

Key takeaway for Agentic OS:

- Empty state should preserve the page structure.
- For filtered views, keep headers/toolbars visible.
- Empty copy should be short and action-oriented.
- Every first-use state should have the next action: add project, start terminal, refresh catalog, scan MCP, run Dream.

### Command palette

VS Code command palette guidance emphasizes clear command names, category prefixes, and keyboard shortcuts where appropriate.

Source: https://code.visualstudio.com/api/ux-guidelines/command-palette

Key takeaway for Agentic OS:

- Add `Ctrl+K` command palette.
- Use command names like:
  - `Project: Add project`
  - `Run: Start terminal`
  - `Graphify: Refresh graph`
  - `Catalog: Refresh tools`
  - `MCP: Check server`
  - `Dream: Run analysis`
- Do not hide common actions behind unlabeled icons.

## 3. Current UI Audit

Current strengths:

- Strong visual identity: near-black, amber/teal/purple, glass panels, monospace labels.
- Real app surface already exists: Home, Sessions, Memory, Dream, Command Center, Catalog, MCP.
- Command Center has real workflow pieces: project selector, terminal, run history, replay, Graphify, prompt attachments.
- Catalog and MCP already share a useful manager pattern: toolbar, list, detail, context panel.

Current weaknesses:

- Pages own their own micro-design systems with repeated inline styles.
- No responsive system or media-query strategy.
- Fixed multi-column layouts can overflow on laptop/tablet widths.
- Many labels are 10px or smaller; sidebar labels are about 7.5px.
- Muted text contrast is too low for common labels.
- Buttons lack consistent focus states.
- Route-level layouts duplicate `<html><body>` under `home`, `catalog`, and `sessions`.
- Home is usage-heavy but not yet an operations dashboard.
- Command Center is powerful but visually overloaded.
- No global command palette.
- No Settings page after setup.
- No dedicated Approvals/Timeline UI yet.
- Agents are buried inside Catalog rather than first-class.

## 4. Design Direction

Recommended visual concept:

```txt
Industrial AI Mission Control
```

The app should feel like a refined developer operations console, not a game HUD and not a generic SaaS dashboard.

Traits:

- dark neutral base
- precise borders and dividers
- controlled glow only for live/active states
- dense information layout
- strong status semantics
- readable typography
- command-first interactions
- evidence panels and replay timelines

Keep:

- dark cockpit identity
- terminal feel
- amber as brand signal
- JetBrains Mono for technical data
- glass/blur sparingly

Reduce:

- excessive glow on every card
- repeated purple usage
- tiny labels
- all-caps everywhere
- equal card weight for unequal actions

## 5. Theme And Color System

Current theme is close, but it needs semantic tokens.

### Base Tokens

```css
--surface-0: #07080d;
--surface-1: #0d1117;
--surface-2: #121722;
--surface-3: #18202c;
--border-subtle: rgba(226, 232, 240, 0.08);
--border-strong: rgba(226, 232, 240, 0.16);
--text-strong: #f4f7fb;
--text: #d8dee9;
--text-muted: rgba(216, 222, 233, 0.68);
--text-faint: rgba(216, 222, 233, 0.48);
```

### Semantic Status Tokens

```css
--brand: #f59e0b;
--info: #38bdf8;
--success: #22c55e;
--active: #14b8a6;
--warning: #f59e0b;
--danger: #ef4444;
--discovery: #a78bfa;
```

### Usage Rules

- Brand amber: app identity, primary CTA, selected nav.
- Teal/cyan: active connection, running state, selected workspace object.
- Green: success, healthy, completed.
- Amber: pending, caution, quota warning.
- Red: failed, destructive, missing secrets/config.
- Purple: AI insight, Dream, discovery; not default decoration.
- Neutral: most cards, tables, secondary controls.

### Chart Palette

Use semantic chart colors:

- cost: amber
- tokens/traffic: cyan
- successful runs: green
- failures: red
- insights/opportunities: purple
- neutral baselines: slate

Avoid stacking many glowy colors in one chart.

## 6. Typography

Current fonts:

- `Bebas Neue` display
- `JetBrains Mono` technical
- `Syne` body

Recommendation:

- Keep `JetBrains Mono`.
- Keep `Bebas Neue` only for brand marks or very short section labels.
- Use `Syne` more consistently for human-readable body text, or move to a calmer body font later.

Type scale:

- Page title: 28-32px
- Section title: 14-16px
- Body/list text: 13-14px
- Metadata: 11-12px minimum
- Avoid 7.5px labels.

All-caps:

- Use for short labels only.
- Use normal case for longer messages, empty states, and explanations.

## 7. Core Feature Upgrades

### P0: Command Center Timeline And Approvals

Why:

This is the difference between "terminal in browser" and real AI command center.

UI features:

- Live timeline next to terminal.
- Approval queue panel.
- File changes summary.
- Run replay tabs:
  - Transcript
  - Timeline
  - Files
  - Metadata
- Risk badges:
  - read-only
  - local edit
  - shell command
  - network
  - destructive
- Evidence links back to raw logs.

Design:

- Terminal remains primary.
- Timeline is a narrow right rail on desktop.
- On smaller screens, timeline becomes tabs under terminal.
- Approvals use amber/red status and require explicit user action.

### P0: Responsive Shell And Design System

Why:

Current pages duplicate layout and break at narrower widths.

Build shared primitives:

- `PageFrame`
- `PageHeader`
- `ActionButton`
- `Toolbar`
- `StatCard`
- `StatusPill`
- `InspectorLayout`
- `DataTable`
- `EmptyState`
- `InlineAlert`
- `Tabs`
- `SegmentedControl`

Shell changes:

- sidebar can collapse to icons
- top bar gets project/run context
- main content gets responsive max/min width handling
- mobile/tablet stacks panels instead of forcing 3 columns

### P0: Global Command Palette

Why:

Agentic OS has many actions. A command palette makes the app feel like a developer tool.

Actions:

- Add project
- Open Command Center
- Start terminal
- Open run replay
- Refresh Graphify
- Refresh Catalog
- Check MCP servers
- Run Dream
- Search sessions
- Open settings

Design:

- `Ctrl+K` opens palette.
- Commands grouped by category.
- Recent projects/runs appear at top.
- Empty search state suggests common actions.

### P1: Operations Home

Upgrade Home from usage overview to AI operations dashboard.

Top questions:

- Is the bridge online?
- What is running now?
- What needs attention?
- What did agents do today?
- What cost/quota pressure exists?
- Which projects are stale?
- Which tools are broken?

Sections:

- Active run strip
- Attention queue:
  - failed runs
  - pending approvals
  - missing MCP env
  - stale Graphify
  - stale memory
- Usage and cost trend
- Provider quota cards
- Top projects by activity
- Top skills/tools used
- Dream recommendations preview

### P1: Agents Surface

Agents should be first-class, not only catalog items.

Features:

- Agent roster
- role/category filters
- active/inactive availability
- compatible providers
- linked skills
- last used
- prompt attachment action
- "start with agent" shortcut

Implementation can reuse catalog data where `kind='agent'`.

### P1: Settings

Features:

- show current config safely
- update project base path
- update Obsidian path
- update hourly rate
- show Claude/Codex availability
- token rotation flow
- feature flags:
  - multi-agent
  - advanced timeline
  - visual QA
- MCP paths summary

Do not show auth token raw after setup.

### P1: Dream v2 UI

Features:

- global/project scope
- insight list with severity/confidence/ROI
- evidence detail panel
- links to run/project/MCP/catalog/Graphify
- filters by type/status/severity
- actions:
  - mark applied
  - skip
  - open related object
  - create skill draft

### P2: Sessions And Memory Upgrade

Sessions:

- semantic table
- project filter
- provider/model filter
- cost/token/duration sort
- session detail drawer
- link to run history where available

Memory:

- project/global split
- stale/active/fresh status
- source type
- last touched
- refresh actions
- warnings for stale high-impact memory

## 8. Page-By-Page Redesign Plan

### Home

Current:

- session count, tokens, cost, chart, subscription cards.

Upgrade:

- "Today at a glance" with operations-first KPIs.
- Attention queue above charts.
- Smaller, denser metric cards.
- Links to broken MCP, failed runs, stale graphs.

### Command Center

Current:

- all functionality stacked in one long page.

Upgrade:

- workspace layout:
  - top: active project and run controls
  - center: terminal
  - right: timeline/approvals/context
  - bottom: replay/details drawer
- Graphify and reports become context tabs instead of always full-width sections.
- One-shot prompt becomes a compact drawer or mode tab.

### Catalog

Current:

- good 3-column manager pattern.

Upgrade:

- shared inspector layout.
- tabs for Skills, Agents, Commands, Rules.
- stronger attachment state.
- "recommended for current project" section.

### MCP

Current:

- newly implemented and functional.

Upgrade:

- integrate into Home attention queue.
- add drift grouping.
- add docs links/help hints.
- add "copy env name" action, not env values.

### Dream

Current:

- simple queue.

Upgrade:

- evidence-backed insight cockpit.
- insight detail panel.
- ROI and confidence visible.

### Sessions

Current:

- fixed grid table.

Upgrade:

- semantic data table with responsive row cards.
- filters and sort.
- detail drawer.

### Memory

Current:

- basic freshness.

Upgrade:

- knowledge health view.
- stale memory action queue.
- project/global grouping.

## 9. Component System Plan

Create:

```txt
apps/dashboard/src/components/ui/
  ActionButton.tsx
  EmptyState.tsx
  Field.tsx
  InlineAlert.tsx
  PageFrame.tsx
  PageHeader.tsx
  SectionHeader.tsx
  StatCard.tsx
  StatusPill.tsx
  Tabs.tsx
  Toolbar.tsx

apps/dashboard/src/components/layout/
  CommandPalette.tsx
  ResponsiveShell.tsx

apps/dashboard/src/components/workspace/
  InspectorLayout.tsx
  DataTable.tsx
  Timeline.tsx
  AttentionQueue.tsx
```

Rules:

- Existing pages should stop defining title/button/toolbar styles inline.
- Cards should be used for repeated items and true panels, not every section.
- Use CSS classes and tokens for layout, not repeated style objects everywhere.
- Keep old components during migration; replace page by page.

## 10. Responsive Rules

Breakpoints:

- desktop wide: `>=1280px`
- laptop: `1024-1279px`
- tablet: `768-1023px`
- mobile: `<768px`

Rules:

- 3-column inspector layouts collapse to list + detail tabs below 1024px.
- Command Center right rail moves under terminal below 1100px.
- Summary cards wrap with `auto-fit`.
- Sidebar collapses or becomes top compact nav on mobile.
- Buttons keep stable heights and do not wrap labels.
- Data tables become stacked row cards on mobile.

## 11. Interaction Model

Global:

- `Ctrl+K`: command palette
- `Esc`: close drawer/palette
- `/`: focus local search when available
- `?`: shortcut/help overlay later

Page actions:

- primary CTA always top-right of page header or toolbar
- destructive actions red and confirm
- risky agent actions require explicit approval
- contextual row actions should be menus or icon buttons with tooltips

## 12. Accessibility And QA

Must fix:

- no sidebar text below 10px
- no common metadata below 11px
- consistent focus ring for buttons/links/inputs/selects
- muted text contrast improved
- semantic tables where data is tabular
- status labels include text, not color alone
- reduced-motion support for animations
- no clipped text at mobile/tablet widths

Visual QA:

- 1440px desktop
- 1024px laptop
- 768px tablet
- 390px mobile

Run:

- `npm run build --workspace=apps/dashboard`
- browser smoke for main routes
- console error check

## 13. Implementation Roadmap

### Slice 1: Design Foundation

Files:

- `globals.css`
- `layout.tsx`
- `AppShellClient.tsx`
- `Sidebar.tsx`
- `TopBar.tsx`
- new UI primitives

Tasks:

1. Add semantic CSS tokens.
2. Add responsive utilities.
3. Add shared page/header/button/status/stat components.
4. Normalize focus states.
5. Remove route-level duplicate layouts.

Acceptance:

- Existing routes still render.
- Build passes.
- Sidebar/topbar look more polished.
- No page loses functionality.

### Slice 2: Command Palette

Files:

- `CommandPalette.tsx`
- `AppShellClient.tsx`
- `lib/projects.ts`, `lib/runs.ts`, `lib/mcp.ts`, `lib/catalog.ts`

Tasks:

1. Add `Ctrl+K` palette.
2. Add navigation commands.
3. Add project/run commands.
4. Add MCP/Catalog/Dream commands.

Acceptance:

- Palette opens from any page.
- Actions are searchable and categorized.
- No keyboard trap.

### Slice 3: Home Operations Dashboard

Files:

- `home/page.tsx`
- backend aggregate route if needed

Tasks:

1. Redesign Home around attention queue.
2. Add MCP/Dream/Graphify/run health summaries.
3. Keep usage/cost but subordinate to operations status.

Acceptance:

- Home answers: what needs attention?
- Cost/quota still visible.

### Slice 4: Command Center Redesign

Files:

- `coding/page.tsx`
- `components/coding/*`
- timeline components after Phase 6 backend

Tasks:

1. Create workspace layout.
2. Make terminal primary.
3. Move graph/report/history into context tabs.
4. Add timeline/approvals when backend is ready.

Acceptance:

- Terminal workflow is faster to use.
- Graphify remains accessible.
- Run replay remains accessible.

### Slice 5: Catalog/MCP Shared Inspector

Files:

- `catalog/page.tsx`
- `mcp/page.tsx`
- `components/workspace/InspectorLayout.tsx`

Tasks:

1. Extract shared inspector layout.
2. Apply to Catalog and MCP.
3. Add responsive collapse.

Acceptance:

- Same interaction grammar across both pages.
- Less duplicated inline layout code.

### Slice 6: Dream, Sessions, Memory Polish

Tasks:

1. Dream evidence UI.
2. Sessions semantic/responsive table.
3. Memory knowledge health view.

Acceptance:

- All secondary pages match new design system.

## 14. Recommended First Implementation Slice

Start with Slice 1 because it reduces risk for every later UI change:

1. Add semantic tokens and responsive helpers.
2. Add `PageFrame`, `PageHeader`, `ActionButton`, `StatusPill`, `StatCard`, `EmptyState`.
3. Polish shell/sidebar/topbar.
4. Convert Home to use the new primitives as the proof-of-pattern.

This gives immediate visible improvement without waiting on Phase 6 backend.

## 15. Success Criteria

The redesign is successful when:

- The app looks intentional and coherent across all routes.
- Pages no longer feel like separate inline-style prototypes.
- Command Center clearly prioritizes terminal/run workflow.
- Home shows operational attention, not just metrics.
- MCP/Catalog/Dream/Sessions use consistent list/detail/status patterns.
- The app is usable at 1440px, 1024px, 768px, and 390px.
- No secrets are exposed in UI.
- Build passes after each slice.
