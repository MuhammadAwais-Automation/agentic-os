import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getDb } from '../db'

export type CatalogKind = 'skill' | 'agent' | 'command' | 'rule'
export type CatalogTarget = 'claude' | 'codex' | 'both' | 'generic'

export interface CatalogItem {
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

interface ScanRoot {
  dir: string
  kind: CatalogKind
  source: string
  target: CatalogTarget
  projectId: string | null
  projectPath: string | null
}

interface ParsedMetadata {
  name: string
  description: string | null
  category: string | null
  tags: string[]
}

const ignoredDirs = new Set(['.git', '.next', 'dist', 'build', 'coverage', 'graphify-out', 'node_modules'])
const previewLimit = 8 * 1024

export function refreshCatalog(projectId?: string): { scanned: number; items: CatalogItem[] } {
  const project = projectId
    ? getDb().prepare('SELECT id, path FROM projects WHERE id = ?').get(projectId) as { id: string; path: string } | undefined
    : undefined
  if (projectId && !project) throw new Error(`Project not found: ${projectId}`)

  const roots = scanRoots(project || null)
  const seen = new Set<string>()
  const items: CatalogItem[] = []
  const now = Date.now()

  for (const root of roots) {
    for (const filePath of discoverCatalogFiles(root)) {
      const item = itemFromFile(root, filePath, now)
      seen.add(item.path)
      upsertCatalogItem(item)
      items.push(item)
    }
  }

  return { scanned: seen.size, items }
}

export function listCatalogItems(filters: {
  kind?: string
  category?: string
  source?: string
  target?: string
  q?: string
  projectId?: string
}): CatalogItem[] {
  const clauses: string[] = []
  const params: unknown[] = []

  if (filters.kind) {
    clauses.push('kind = ?')
    params.push(filters.kind)
  }
  if (filters.category) {
    clauses.push('category = ?')
    params.push(filters.category)
  }
  if (filters.source) {
    clauses.push('source = ?')
    params.push(filters.source)
  }
  if (filters.target) {
    clauses.push('(target = ? OR target = ?)')
    params.push(filters.target, 'both')
  }
  if (filters.projectId) {
    clauses.push('(project_id = ? OR project_id IS NULL)')
    params.push(filters.projectId)
  }
  if (filters.q) {
    clauses.push('(LOWER(name) LIKE ? OR LOWER(COALESCE(description, \'\')) LIKE ? OR LOWER(path) LIKE ?)')
    const q = `%${filters.q.toLowerCase()}%`
    params.push(q, q, q)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = getDb()
    .prepare(`
      SELECT * FROM catalog_items
      ${where}
      ORDER BY
        CASE kind WHEN 'skill' THEN 0 WHEN 'agent' THEN 1 WHEN 'command' THEN 2 ELSE 3 END,
        COALESCE(last_used_at, 0) DESC,
        name ASC
    `)
    .all(...params)
  return rows.map(formatCatalogItem)
}

export function getCatalogItem(id: string): CatalogItem & { preview: string } {
  const row = getDb().prepare('SELECT * FROM catalog_items WHERE id = ?').get(id)
  if (!row) throw new Error(`Catalog item not found: ${id}`)
  const item = formatCatalogItem(row)
  return { ...item, preview: readPreview(item.path) }
}

export function catalogSummary(projectId?: string) {
  const items = listCatalogItems({ projectId })
  const byKind = countBy(items, (item) => item.kind)
  const byCategory = countBy(items, (item) => item.category || 'uncategorized')
  const bySource = countBy(items, (item) => item.source)
  const byTarget = countBy(items, (item) => item.target)
  return {
    total: items.length,
    byKind,
    byCategory,
    bySource,
    byTarget,
    codexReady: items.filter((item) => item.installedForCodex || item.target === 'codex' || item.target === 'both').length,
    claudeReady: items.filter((item) => item.installedForClaude || item.target === 'claude' || item.target === 'both').length,
    projectLocal: items.filter((item) => item.projectId).length,
  }
}

export function formatCatalogItem(row: any): CatalogItem {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    description: row.description ?? null,
    category: row.category ?? null,
    source: row.source,
    target: row.target,
    path: row.path,
    projectId: row.project_id ?? null,
    projectPath: row.project_path ?? null,
    tags: safeJsonArray(row.tags),
    installedForClaude: Boolean(row.installed_for_claude),
    installedForCodex: Boolean(row.installed_for_codex),
    lastSeenAt: row.last_seen_at,
    lastUsedAt: row.last_used_at ?? null,
  }
}

function scanRoots(project: { id: string; path: string } | null): ScanRoot[] {
  const home = os.homedir()
  const roots: ScanRoot[] = [
    root(home, '.agents/skills', 'skill', 'user-agents', 'both'),
    root(home, '.claude/skills', 'skill', 'user-claude', 'claude'),
    root(home, '.claude/plugins/marketplaces/ecc/skills', 'skill', 'ecc', 'claude'),
    root(home, '.claude/plugins/marketplaces/ecc/.agents/skills', 'skill', 'ecc', 'both'),
    root(home, '.codex/skills', 'skill', 'user-codex', 'codex'),
    root(home, '.codex/prompts', 'command', 'user-codex', 'codex'),
    root(home, '.claude/agents', 'agent', 'user-claude', 'claude'),
    root(home, '.codex/agents', 'agent', 'user-codex', 'codex'),
    root(home, '.agents/agents', 'agent', 'user-agents', 'both'),
    root(home, '.agents/commands', 'command', 'user-agents', 'both'),
    root(home, '.agents/rules', 'rule', 'user-agents', 'both'),
    root(home, '.claude/commands', 'command', 'user-claude', 'claude'),
  ]

  if (project) {
    roots.push(
      root(project.path, '.agents/skills', 'skill', 'project-agents', 'both', project),
      root(project.path, '.claude/skills', 'skill', 'project-claude', 'claude', project),
      root(project.path, '.agents/agents', 'agent', 'project-agents', 'both', project),
      root(project.path, '.codex/agents', 'agent', 'project-codex', 'codex', project),
      root(project.path, '.claude/agents', 'agent', 'project-claude', 'claude', project),
      root(project.path, 'commands', 'command', 'project-agents', 'both', project),
      root(project.path, 'rules', 'rule', 'project-agents', 'both', project),
      root(project.path, '.agents/commands', 'command', 'project-agents', 'both', project),
      root(project.path, '.agents/rules', 'rule', 'project-agents', 'both', project),
    )
  }

  return roots.filter((item) => fs.existsSync(item.dir) && fs.statSync(item.dir).isDirectory())
}

function root(base: string, relative: string, kind: CatalogKind, source: string, target: CatalogTarget, project?: { id: string; path: string }): ScanRoot {
  return {
    dir: path.resolve(base, relative),
    kind,
    source,
    target,
    projectId: project?.id ?? null,
    projectPath: project?.path ?? null,
  }
}

function discoverCatalogFiles(root: ScanRoot): string[] {
  const files: string[] = []
  const stack = [root.dir]
  const visited = new Set<string>()
  while (stack.length) {
    const current = stack.pop()!
    let realCurrent: string
    try {
      realCurrent = fs.realpathSync(current)
    } catch {
      continue
    }
    if (visited.has(realCurrent)) continue
    visited.add(realCurrent)

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) stack.push(full)
        continue
      }
      if (!entry.isFile()) continue
      if (root.kind === 'skill' && entry.name !== 'SKILL.md') continue
      if (root.kind !== 'skill' && !/\.(md|ya?ml|toml|json)$/i.test(entry.name)) continue
      files.push(full)
    }
  }
  return files
}

function itemFromFile(root: ScanRoot, filePath: string, now: number): CatalogItem {
  const content = safeRead(filePath)
  const metadata = parseMetadata(filePath, content, root.kind)
  const category = metadata.category || inferCategory(metadata.name, metadata.description, filePath)
  const target = inferTarget(root.target, filePath, content)
  const id = stableId(root.kind, filePath)
  return {
    id,
    kind: root.kind,
    name: metadata.name,
    description: metadata.description,
    category,
    source: root.source,
    target,
    path: path.resolve(filePath),
    projectId: root.projectId,
    projectPath: root.projectPath,
    tags: metadata.tags,
    installedForClaude: target === 'claude' || target === 'both',
    installedForCodex: target === 'codex' || target === 'both',
    lastSeenAt: now,
    lastUsedAt: null,
  }
}

function parseMetadata(filePath: string, content: string, kind: CatalogKind): ParsedMetadata {
  const frontmatter = parseFrontmatter(content)
  const fallbackName = kind === 'skill' ? path.basename(path.dirname(filePath)) : path.basename(filePath, path.extname(filePath))
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim()
  const firstParagraph = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#') && !line.startsWith('---') && !line.includes(':'))

  return {
    name: cleanText(frontmatter.name || heading || fallbackName),
    description: cleanText(frontmatter.description || firstParagraph || '') || null,
    category: cleanText(frontmatter.category || '') || null,
    tags: parseTags(frontmatter.tags),
  }
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const data: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (pair) data[pair[1]] = pair[2].replace(/^["']|["']$/g, '').trim()
  }
  return data
}

function inferTarget(defaultTarget: CatalogTarget, filePath: string, content: string): CatalogTarget {
  const haystack = `${filePath}\n${content.slice(0, 1000)}`.toLowerCase()
  const mentionsClaude = haystack.includes('claude')
  const mentionsCodex = haystack.includes('codex') || haystack.includes('openai')
  if (mentionsClaude && mentionsCodex) return 'both'
  if (mentionsClaude) return 'claude'
  if (mentionsCodex) return 'codex'
  return defaultTarget
}

function inferCategory(name: string, description: string | null, filePath: string): string {
  const text = `${name} ${description || ''} ${filePath}`.toLowerCase()
  if (/(tdd|test|playwright|e2e|regression|coverage)/.test(text)) return 'testing'
  if (/(security|auth|secret|vuln|xss|csrf)/.test(text)) return 'security'
  if (/(react|next|frontend|ui|css|design|flutter)/.test(text)) return 'frontend'
  if (/(api|database|server|backend|express|postgres|supabase)/.test(text)) return 'backend'
  if (/(research|market|article|docs|writing|content)/.test(text)) return 'research'
  if (/(graphify|memory|compact|learning|introspection|agent|ecc|mcp)/.test(text)) return 'agent-os'
  if (/(commit|review|plan|workflow|orchestrat|build|resolver)/.test(text)) return 'workflow'
  return 'utility'
}

function upsertCatalogItem(item: CatalogItem): void {
  getDb()
    .prepare(`
      INSERT INTO catalog_items
        (id, kind, name, description, category, source, target, path, project_id, project_path,
         tags, installed_for_claude, installed_for_codex, last_seen_at, last_used_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        kind = excluded.kind,
        name = excluded.name,
        description = excluded.description,
        category = excluded.category,
        source = excluded.source,
        target = excluded.target,
        project_id = excluded.project_id,
        project_path = excluded.project_path,
        tags = excluded.tags,
        installed_for_claude = excluded.installed_for_claude,
        installed_for_codex = excluded.installed_for_codex,
        last_seen_at = excluded.last_seen_at
    `)
    .run(
      item.id,
      item.kind,
      item.name,
      item.description,
      item.category,
      item.source,
      item.target,
      item.path,
      item.projectId,
      item.projectPath,
      JSON.stringify(item.tags),
      item.installedForClaude ? 1 : 0,
      item.installedForCodex ? 1 : 0,
      item.lastSeenAt,
      item.lastUsedAt,
    )
}

function safeRead(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return ''
  }
}

function readPreview(filePath: string): string {
  try {
    const fd = fs.openSync(filePath, 'r')
    const buffer = Buffer.alloc(previewLimit)
    const bytes = fs.readSync(fd, buffer, 0, previewLimit, 0)
    fs.closeSync(fd)
    return buffer.subarray(0, bytes).toString('utf-8')
  } catch {
    return ''
  }
}

function stableId(kind: CatalogKind, filePath: string): string {
  return `${kind}_${crypto.createHash('sha1').update(path.resolve(filePath).toLowerCase()).digest('hex').slice(0, 16)}`
}

function cleanText(value: string): string {
  return value.replace(/^["']|["']$/g, '').trim()
}

function parseTags(value?: string): string[] {
  if (!value) return []
  return value.replace(/^\[|\]$/g, '').split(',').map((item) => cleanText(item)).filter(Boolean)
}

function safeJsonArray(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function countBy(items: CatalogItem[], key: (item: CatalogItem) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const value = key(item)
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {})
}
