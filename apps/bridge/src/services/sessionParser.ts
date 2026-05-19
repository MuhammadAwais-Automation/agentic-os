import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getDb } from '../db'
import { getClaudePathCandidates, getCodexPath } from '../config'

const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4': { input: 15, output: 75 },
  'claude-opus-3-5': { input: 15, output: 75 },
  'claude-sonnet-4': { input: 3, output: 15 },
  'claude-sonnet-3-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 0.25, output: 1.25 },
  'claude-haiku-3': { input: 0.25, output: 1.25 },
  'gpt-5.5': { input: 5, output: 15 },
  'gpt-5.4': { input: 3, output: 10 },
  'gpt-5.2': { input: 2, output: 8 },
  default: { input: 3, output: 15 },
}

interface RawUsage {
  input_tokens?: number
  output_tokens?: number
  cached_input_tokens?: number
  reasoning_output_tokens?: number
  total_tokens?: number
}

export interface ParsedSession {
  id: string
  project: string
  started_at: number
  ended_at: number | null
  duration_ms: number | null
  model: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
  raw_path: string
  source: 'claude' | 'codex'
}

export interface SessionDto {
  id: string
  project: string
  startTime: string
  duration: number
  tokens: number
  cost: number
  model: string
  source: 'claude' | 'codex'
  rawPath: string
}

interface QuotaWindow {
  label: string
  window_minutes: number
  used_tokens: number
  estimated_used_percent: number | null
  estimated_remaining_tokens: number | null
  budget_tokens: number | null
  resets_at: number
  resets_at_iso: string
  source: 'estimated' | 'provider'
}

interface ProviderLimitWindow {
  used_percent: number
  window_minutes: number
  resets_at: number
}

export interface UsageQuota {
  claude: {
    available: boolean
    four_hour: QuotaWindow
    weekly: QuotaWindow
  }
  codex: {
    available: boolean
    primary: ProviderLimitWindow | null
    secondary: ProviderLimitWindow | null
  }
  note: string
}

export interface UsageLimits {
  claude: {
    available: boolean
    tokens_used_today: number
    cost_today: number
    sessions_today: number
    quota: UsageQuota['claude']
  }
  codex: UsageQuota['codex']
}

function getPricing(model: string) {
  const normalized = model.toLowerCase()
  for (const key of Object.keys(PRICING)) {
    if (normalized.includes(key)) return PRICING[key]
  }
  return PRICING.default
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function getAt(obj: any, keys: string[]): any {
  let current = obj
  for (const key of keys) {
    if (!current || typeof current !== 'object') return undefined
    current = current[key]
  }
  return current
}

function parseTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 9_999_999_999 ? value : value * 1000
  }
  if (typeof value === 'string') {
    const numeric = Number(value)
    if (Number.isFinite(numeric)) return parseTimestamp(numeric)
    const parsed = new Date(value).getTime()
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function projectFromPath(value: unknown, fallback: string): string {
  const raw = stringValue(value)
  if (!raw) return fallback
  return path.basename(raw.replace(/[\\/]+$/, '')) || fallback
}

function costFor(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = getPricing(model)
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output
}

function discoverJsonlFiles(root: string, maxDepth = 5): string[] {
  if (!fs.existsSync(root)) return []
  const out: string[] = []
  const walk = (dir: string, depth: number) => {
    if (depth > maxDepth) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'plugins' || entry.name === '.tmp') continue
        walk(full, depth + 1)
      } else if (entry.isFile() && (entry.name.endsWith('.jsonl') || entry.name.endsWith('.json'))) {
        out.push(full)
      }
    }
  }
  walk(root, 0)
  return out
}

function readJsonLines(filePath: string): any[] {
  try {
    return fs.readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try { return JSON.parse(line) } catch { return null }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

function extractUsage(raw: any): RawUsage {
  return (
    getAt(raw, ['usage']) ||
    getAt(raw, ['message', 'usage']) ||
    getAt(raw, ['payload', 'usage']) ||
    getAt(raw, ['payload', 'info', 'last_token_usage']) ||
    getAt(raw, ['payload', 'info', 'total_token_usage']) ||
    {}
  )
}

function extractModel(raw: any, fallback: string): string {
  return (
    stringValue(raw.model) ||
    stringValue(getAt(raw, ['message', 'model'])) ||
    stringValue(getAt(raw, ['payload', 'model'])) ||
    stringValue(getAt(raw, ['payload', 'info', 'model'])) ||
    fallback
  )
}

function extractTimestamp(raw: any): number {
  return (
    parseTimestamp(raw.timestamp) ||
    parseTimestamp(getAt(raw, ['payload', 'timestamp'])) ||
    parseTimestamp(raw.updated_at) ||
    0
  )
}

function upsertSession(sessions: Map<string, ParsedSession>, item: ParsedSession): void {
  const existing = sessions.get(item.id)
  if (!existing) {
    sessions.set(item.id, item)
    return
  }
  existing.input_tokens += item.input_tokens
  existing.output_tokens += item.output_tokens
  existing.cost_usd += item.cost_usd
  existing.started_at = Math.min(existing.started_at, item.started_at)
  existing.ended_at = Math.max(existing.ended_at || item.ended_at || item.started_at, item.ended_at || item.started_at)
  existing.duration_ms = (existing.ended_at || existing.started_at) - existing.started_at
  if (existing.model === 'unknown' && item.model !== 'unknown') existing.model = item.model
  if (existing.project === 'unknown' && item.project !== 'unknown') existing.project = item.project
}

function parseClaudeSessions(): ParsedSession[] {
  const sessions = new Map<string, ParsedSession>()

  for (const claudePath of getClaudePathCandidates()) {
    const historyFile = path.join(claudePath, 'history.jsonl')
    const historyLines = fs.existsSync(historyFile) ? readJsonLines(historyFile) : []
    for (const raw of historyLines) {
      const ts = extractTimestamp(raw)
      if (!ts) continue
      const id = `claude:${stringValue(raw.sessionId) || crypto.createHash('md5').update(JSON.stringify(raw)).digest('hex')}`
      const usage = extractUsage(raw)
      const input = numberValue(usage.input_tokens)
      const output = numberValue(usage.output_tokens)
      const model = extractModel(raw, 'unknown')
      upsertSession(sessions, {
        id,
        project: projectFromPath(raw.cwd || raw.project, 'unknown'),
        started_at: ts,
        ended_at: ts,
        duration_ms: 0,
        model,
        input_tokens: input,
        output_tokens: output,
        cost_usd: costFor(model, input, output),
        raw_path: historyFile,
        source: 'claude',
      })
    }

    const projectFiles = discoverJsonlFiles(path.join(claudePath, 'projects'))
    const sessionFiles = discoverJsonlFiles(path.join(claudePath, 'sessions'), 1)
    for (const filePath of [...projectFiles, ...sessionFiles]) {
      const lines = readJsonLines(filePath)
      if (lines.length === 0) continue
      const sessionId = stringValue(lines.find((line) => stringValue(line.sessionId))?.sessionId) ||
        path.basename(filePath, path.extname(filePath))
      const id = `claude:${sessionId}`
      const fallbackProject = path.basename(path.dirname(filePath)).replace(/--/g, ':').replace(/-/g, path.sep)
      let start = 0
      let end = 0
      let input = 0
      let output = 0
      let model = 'unknown'
      let project = projectFromPath(fallbackProject, 'unknown')

      for (const raw of lines) {
        const ts = extractTimestamp(raw)
        if (ts && (!start || ts < start)) start = ts
        if (ts && ts > end) end = ts
        model = extractModel(raw, model)
        project = projectFromPath(raw.cwd || raw.project, project)
        const usage = extractUsage(raw)
        input += numberValue(usage.input_tokens) + numberValue(usage.cached_input_tokens)
        output += numberValue(usage.output_tokens) + numberValue(usage.reasoning_output_tokens)
      }

      if (!start) continue
      upsertSession(sessions, {
        id,
        project,
        started_at: start,
        ended_at: end || start,
        duration_ms: end ? end - start : 0,
        model,
        input_tokens: input,
        output_tokens: output,
        cost_usd: costFor(model, input, output),
        raw_path: filePath,
        source: 'claude',
      })
    }
  }

  return Array.from(sessions.values())
}

function parseCodexSessions(): ParsedSession[] {
  const codexPath = getCodexPath()
  const files = discoverJsonlFiles(path.join(codexPath, 'sessions'))
  const sessions: ParsedSession[] = []

  for (const filePath of files) {
    const lines = readJsonLines(filePath)
    if (lines.length === 0) continue
    let start = 0
    let end = 0
    let input = 0
    let output = 0
    let model = 'codex'
    let project = 'codex'

    for (const raw of lines) {
      const ts = extractTimestamp(raw)
      if (ts && (!start || ts < start)) start = ts
      if (ts && ts > end) end = ts
      model = extractModel(raw, model)
      project = projectFromPath(raw.cwd || getAt(raw, ['payload', 'cwd']), project)
      if (getAt(raw, ['payload', 'type']) === 'token_count') {
        const usage = getAt(raw, ['payload', 'info', 'last_token_usage']) || {}
        input += numberValue(usage.input_tokens) + numberValue(usage.cached_input_tokens)
        output += numberValue(usage.output_tokens) + numberValue(usage.reasoning_output_tokens)
      }
    }

    if (!start) continue
    sessions.push({
      id: `codex:${path.basename(filePath, path.extname(filePath)).replace(/^rollout-/, '')}`,
      project,
      started_at: start,
      ended_at: end || start,
      duration_ms: end ? end - start : 0,
      model,
      input_tokens: input,
      output_tokens: output,
      cost_usd: costFor(model, input, output),
      raw_path: filePath,
      source: 'codex',
    })
  }

  return sessions
}

function ensureSessionSourceColumn(): void {
  const db = getDb()
  const columns = db.prepare("PRAGMA table_info(sessions)").all() as { name: string }[]
  if (!columns.some((column) => column.name === 'source')) {
    db.exec("ALTER TABLE sessions ADD COLUMN source TEXT NOT NULL DEFAULT 'claude'")
  }
}

export function parseAndStoreSessions(): ParsedSession[] {
  ensureSessionSourceColumn()
  const db = getDb()
  const all = [...parseClaudeSessions(), ...parseCodexSessions()]
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO sessions
    (id, project, started_at, ended_at, duration_ms, model, input_tokens, output_tokens, cost_usd, raw_path, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  for (const s of all) {
    upsert.run(s.id, s.project, s.started_at, s.ended_at, s.duration_ms, s.model,
      s.input_tokens, s.output_tokens, s.cost_usd, s.raw_path, s.source)
  }
  return all
}

function toDto(row: ParsedSession): SessionDto {
  return {
    id: row.id,
    project: row.project,
    startTime: new Date(row.started_at).toISOString(),
    duration: Math.round((row.duration_ms || 0) / 60000),
    tokens: row.input_tokens + row.output_tokens,
    cost: row.cost_usd,
    model: row.model,
    source: row.source || 'claude',
    rawPath: row.raw_path,
  }
}

export function getSessionsFromDb(): SessionDto[] {
  ensureSessionSourceColumn()
  const rows = getDb().prepare('SELECT * FROM sessions ORDER BY started_at DESC').all() as ParsedSession[]
  return rows.map(toDto)
}

export function getTodayStats() {
  ensureSessionSourceColumn()
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
  return getDb().prepare(`
    SELECT
      COUNT(*) as session_count,
      COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens,
      COALESCE(SUM(cost_usd), 0) as total_cost,
      COALESCE(SUM(duration_ms), 0) as duration_ms
    FROM sessions WHERE started_at >= ?
  `).get(startOfDay.getTime()) as { session_count: number; total_tokens: number; total_cost: number; duration_ms: number }
}

export function getWeeklyCosts(): { day: string; cost: number }[] {
  ensureSessionSourceColumn()
  return getDb().prepare(`
    SELECT date(started_at / 1000, 'unixepoch') as day, SUM(cost_usd) as cost
    FROM sessions WHERE started_at >= ?
    GROUP BY day ORDER BY day ASC
  `).all(Date.now() - 7 * 24 * 60 * 60 * 1000) as { day: string; cost: number }[]
}

function aggregateTokensSince(since: number, source: 'claude' | 'codex'): number {
  const row = getDb().prepare(`
    SELECT COALESCE(SUM(input_tokens + output_tokens), 0) as tokens
    FROM sessions WHERE source = ? AND started_at >= ?
  `).get(source, since) as { tokens: number }
  return row.tokens
}

function estimatedQuotaWindow(label: string, minutes: number, budgetTokens: number | null): QuotaWindow {
  const now = Date.now()
  const since = now - minutes * 60 * 1000
  const used = aggregateTokensSince(since, 'claude')
  const resetsAt = since + minutes * 60 * 1000
  const usedPercent = budgetTokens ? Math.min(100, (used / budgetTokens) * 100) : null
  return {
    label,
    window_minutes: minutes,
    used_tokens: used,
    estimated_used_percent: usedPercent,
    estimated_remaining_tokens: budgetTokens ? Math.max(0, budgetTokens - used) : null,
    budget_tokens: budgetTokens,
    resets_at: resetsAt,
    resets_at_iso: new Date(resetsAt).toISOString(),
    source: 'estimated',
  }
}

function latestCodexRateLimits(): UsageQuota['codex'] {
  const codexPath = getCodexPath()
  let latest: { primary: ProviderLimitWindow | null; secondary: ProviderLimitWindow | null; ts: number } | null = null
  for (const filePath of discoverJsonlFiles(path.join(codexPath, 'sessions'))) {
    for (const raw of readJsonLines(filePath)) {
      if (getAt(raw, ['payload', 'type']) !== 'token_count') continue
      const rateLimits = getAt(raw, ['payload', 'rate_limits'])
      if (!rateLimits) continue
      const ts = extractTimestamp(raw)
      if (!latest || ts > latest.ts) {
        latest = {
          ts,
          primary: rateLimits.primary || null,
          secondary: rateLimits.secondary || null,
        }
      }
    }
  }
  return {
    available: Boolean(latest),
    primary: latest?.primary || null,
    secondary: latest?.secondary || null,
  }
}

export function getQuotaStatus(): UsageQuota {
  ensureSessionSourceColumn()
  return {
    claude: {
      available: true,
      four_hour: estimatedQuotaWindow('4-hour estimated usage', 240, null),
      weekly: estimatedQuotaWindow('Weekly estimated usage', 10080, null),
    },
    codex: latestCodexRateLimits(),
    note: 'Claude subscription remaining quota is estimated from local logs unless a provider rate-limit event is available.',
  }
}

export function getUsageLimits(): UsageLimits {
  const { loadConfig } = require('../config')
  const cfg = loadConfig()
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const row = getDb().prepare(`
    SELECT
      COUNT(*) as session_count,
      COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens,
      COALESCE(SUM(cost_usd), 0) as total_cost
    FROM sessions WHERE started_at >= ?
  `).get(startOfDay.getTime()) as { session_count: number; total_tokens: number; total_cost: number }
  const quota = getQuotaStatus()

  return {
    claude: {
      available: Boolean(cfg.claudeAvailable),
      tokens_used_today: row.total_tokens,
      cost_today: row.total_cost,
      sessions_today: row.session_count,
      quota: quota.claude,
    },
    codex: {
      available: Boolean(cfg.codexAvailable) || quota.codex.available,
      primary: quota.codex.primary,
      secondary: quota.codex.secondary,
    },
  }
}
