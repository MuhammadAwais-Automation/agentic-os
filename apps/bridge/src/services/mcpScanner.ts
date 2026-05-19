import crypto from 'crypto'
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getClaudePathCandidates, getCodexPath } from '../config'
import { getDb } from '../db'

export type McpScope = 'user' | 'project' | 'ecc'
export type McpStatus = 'configured' | 'missing_env' | 'invalid_config' | 'healthy' | 'unhealthy'
export type McpDriftStatus = 'matches' | 'missing' | 'extra' | 'changed' | 'unknown'

export interface McpServerRecord {
  id: string
  name: string
  source: string
  scope: McpScope
  projectId: string | null
  projectPath: string | null
  command: string | null
  url: string | null
  args: string[]
  envKeys: string[]
  requiredEnvKeys: string[]
  missingEnvKeys: string[]
  status: McpStatus
  driftStatus: McpDriftStatus
  configPath: string | null
  lastSeenAt: number
  lastCheckedAt: number | null
  healthMessage: string | null
}

interface ProjectRef {
  id: string
  path: string
}

interface RawMcpServer {
  name: string
  command: string | null
  url: string | null
  args: string[]
  envKeys: string[]
  envValueRefs: string[]
  configPath: string
}

interface ScanSource {
  source: string
  scope: McpScope
  configPath: string
  project: ProjectRef | null
  parser: 'toml' | 'json'
}

export function refreshMcpServers(projectId?: string): { scanned: number; servers: McpServerRecord[] } {
  const project = resolveProject(projectId)
  const now = Date.now()
  const sources = scanSources(project)
  const servers = sources.flatMap((source) => readSource(source, now))

  for (const server of servers) {
    upsertServer(server)
  }

  return { scanned: servers.length, servers }
}

export function listMcpServers(projectId?: string): McpServerRecord[] {
  const clauses = ['(project_id IS NULL']
  const params: unknown[] = []
  if (projectId) {
    clauses[0] += ' OR project_id = ?'
    params.push(projectId)
  }
  clauses[0] += ')'

  const rows = getDb()
    .prepare(`
      SELECT * FROM mcp_servers
      WHERE ${clauses.join(' AND ')}
      ORDER BY
        CASE scope WHEN 'project' THEN 0 WHEN 'user' THEN 1 ELSE 2 END,
        source ASC,
        name ASC
    `)
    .all(...params)

  return rows.map(formatServer)
}

export function getMcpSummary(projectId?: string) {
  const servers = listMcpServers(projectId)
  return {
    total: servers.length,
    byStatus: countBy(servers, (server) => server.status),
    byScope: countBy(servers, (server) => server.scope),
    bySource: countBy(servers, (server) => server.source),
    byDrift: countBy(servers, (server) => server.driftStatus),
    missingEnv: servers.reduce((total, server) => total + server.missingEnvKeys.length, 0),
  }
}

export function checkMcpServer(serverId: string): McpServerRecord {
  const row = getDb().prepare('SELECT * FROM mcp_servers WHERE id = ?').get(serverId)
  if (!row) throw new Error(`MCP server not found: ${serverId}`)
  const server = formatServer(row)
  const startedAt = Date.now()
  const result = runSafeHealthCheck(server)
  const checkedAt = Date.now()

  getDb()
    .prepare('UPDATE mcp_servers SET status = ?, last_checked_at = ?, health_message = ? WHERE id = ?')
    .run(result.status, checkedAt, result.message, server.id)
  getDb()
    .prepare('INSERT INTO mcp_health_checks (server_id, checked_at, status, message, duration_ms) VALUES (?, ?, ?, ?, ?)')
    .run(server.id, checkedAt, result.status, result.message, checkedAt - startedAt)

  return {
    ...server,
    status: result.status,
    lastCheckedAt: checkedAt,
    healthMessage: result.message,
  }
}

function resolveProject(projectId?: string): ProjectRef | null {
  if (!projectId) return null
  const row = getDb().prepare('SELECT id, path FROM projects WHERE id = ?').get(projectId) as ProjectRef | undefined
  if (!row) throw new Error(`Project not found: ${projectId}`)
  return row
}

function scanSources(project: ProjectRef | null): ScanSource[] {
  const home = os.homedir()
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')
  const sources: ScanSource[] = [
    source('user-codex', 'user', path.join(getCodexPath(), 'config.toml'), null, 'toml'),
    ...getClaudePathCandidates().map((candidate) =>
      source('user-claude', 'user', path.join(candidate, 'claude_desktop_config.json'), null, 'json')),
    source('user-claude', 'user', path.join(home, '.claude', 'mcp.json'), null, 'json'),
    source('ecc-codex', 'ecc', path.join(repoRoot, '.codex', 'config.toml'), null, 'toml'),
  ]

  const mcpConfigDir = path.join(repoRoot, 'mcp-configs')
  if (fs.existsSync(mcpConfigDir) && fs.statSync(mcpConfigDir).isDirectory()) {
    for (const entry of fs.readdirSync(mcpConfigDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      const fullPath = path.join(mcpConfigDir, entry.name)
      if (/\.toml$/i.test(entry.name)) sources.push(source('ecc-catalog', 'ecc', fullPath, null, 'toml'))
      if (/\.json$/i.test(entry.name)) sources.push(source('ecc-catalog', 'ecc', fullPath, null, 'json'))
    }
  }

  if (project) {
    sources.push(
      source('project-codex', 'project', path.join(project.path, '.codex', 'config.toml'), project, 'toml'),
      source('project-mcp', 'project', path.join(project.path, '.mcp.json'), project, 'json'),
      source('project-claude', 'project', path.join(project.path, '.claude', 'mcp.json'), project, 'json'),
    )
  }

  return sources.filter((item) => fs.existsSync(item.configPath) && fs.statSync(item.configPath).isFile())
}

function source(sourceName: string, scope: McpScope, configPath: string, project: ProjectRef | null, parser: 'toml' | 'json'): ScanSource {
  return { source: sourceName, scope, configPath, project, parser }
}

function readSource(scanSource: ScanSource, now: number): McpServerRecord[] {
  try {
    const content = fs.readFileSync(scanSource.configPath, 'utf-8')
    const rawServers = scanSource.parser === 'toml'
      ? parseTomlMcpServers(content, scanSource.configPath)
      : parseJsonMcpServers(content, scanSource.configPath)
    return rawServers.map((raw) => normalizeServer(raw, scanSource, now))
  } catch {
    return []
  }
}

export function parseTomlMcpServers(content: string, configPath = ''): RawMcpServer[] {
  const servers = new Map<string, Record<string, string>>()
  let currentName = ''

  for (const rawLine of content.split(/\r?\n/)) {
    const line = stripComment(rawLine).trim()
    if (!line) continue

    const section = line.match(/^\[(mcp_servers|mcpServers)\.("?[^"\]]+"?|[^\]]+)\]$/)
    if (section) {
      currentName = section[2].replace(/^"|"$/g, '').trim()
      if (currentName && !servers.has(currentName)) servers.set(currentName, {})
      continue
    }

    if (!currentName) continue
    const pair = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/)
    if (!pair) continue
    servers.get(currentName)![pair[1]] = pair[2].trim()
  }

  return Array.from(servers.entries()).map(([name, values]) => {
    const command = parseScalar(values.command || '')
    const args = parseStringArray(values.args || '')
    const envKeys = parseInlineEnvKeys(values.env || '')
    const envValueRefs = extractEnvRefs([values.command || '', values.args || '', values.url || ''].join('\n'))
    return {
      name,
      command,
      url: parseScalar(values.url || ''),
      args,
      envKeys,
      envValueRefs,
      configPath,
    }
  })
}

export function parseJsonMcpServers(content: string, configPath = ''): RawMcpServer[] {
  const parsed = JSON.parse(content) as { mcpServers?: Record<string, any>; mcp_servers?: Record<string, any> }
  const servers = parsed.mcpServers || parsed.mcp_servers || {}
  return Object.entries(servers).map(([name, value]) => {
    const env = isRecord(value?.env) ? value.env : {}
    return {
      name,
      command: typeof value?.command === 'string' ? value.command : null,
      url: typeof value?.url === 'string' ? value.url : null,
      args: Array.isArray(value?.args) ? value.args.map(String) : [],
      envKeys: Object.keys(env),
      envValueRefs: extractEnvRefs([value?.command || '', Array.isArray(value?.args) ? value.args.join(' ') : '', value?.url || ''].join('\n')),
      configPath,
    }
  })
}

function normalizeServer(raw: RawMcpServer, scanSource: ScanSource, now: number): McpServerRecord {
  const requiredEnvKeys = Array.from(new Set([...raw.envKeys, ...raw.envValueRefs])).sort()
  const missingEnvKeys = requiredEnvKeys.filter((key) => !raw.envKeys.includes(key) && !process.env[key])
  const status: McpStatus = !raw.command && !raw.url
    ? 'invalid_config'
    : missingEnvKeys.length
      ? 'missing_env'
      : 'configured'

  return {
    id: stableId(scanSource.scope, scanSource.source, scanSource.project?.path || '', raw.name),
    name: raw.name,
    source: scanSource.source,
    scope: scanSource.scope,
    projectId: scanSource.project?.id ?? null,
    projectPath: scanSource.project?.path ?? null,
    command: raw.command,
    url: raw.url ? redactUrl(raw.url) : null,
    args: raw.args,
    envKeys: raw.envKeys.sort(),
    requiredEnvKeys,
    missingEnvKeys,
    status,
    driftStatus: scanSource.scope === 'ecc' ? 'matches' : 'unknown',
    configPath: raw.configPath,
    lastSeenAt: now,
    lastCheckedAt: null,
    healthMessage: status === 'missing_env'
      ? `Missing env: ${missingEnvKeys.join(', ')}`
      : status === 'invalid_config'
        ? 'Missing command or URL'
        : null,
  }
}

function upsertServer(server: McpServerRecord): void {
  getDb()
    .prepare(`
      INSERT INTO mcp_servers
        (id, name, source, scope, project_id, project_path, command, url, args, env_keys,
         required_env_keys, missing_env_keys, status, drift_status, config_path,
         last_seen_at, last_checked_at, health_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        source = excluded.source,
        scope = excluded.scope,
        project_id = excluded.project_id,
        project_path = excluded.project_path,
        command = excluded.command,
        url = excluded.url,
        args = excluded.args,
        env_keys = excluded.env_keys,
        required_env_keys = excluded.required_env_keys,
        missing_env_keys = excluded.missing_env_keys,
        status = excluded.status,
        drift_status = excluded.drift_status,
        config_path = excluded.config_path,
        last_seen_at = excluded.last_seen_at,
        health_message = excluded.health_message
    `)
    .run(
      server.id,
      server.name,
      server.source,
      server.scope,
      server.projectId,
      server.projectPath,
      server.command,
      server.url,
      JSON.stringify(server.args),
      JSON.stringify(server.envKeys),
      JSON.stringify(server.requiredEnvKeys),
      JSON.stringify(server.missingEnvKeys),
      server.status,
      server.driftStatus,
      server.configPath,
      server.lastSeenAt,
      server.lastCheckedAt,
      server.healthMessage,
    )
}

function runSafeHealthCheck(server: McpServerRecord): { status: McpStatus; message: string } {
  if (!server.command && !server.url) return { status: 'invalid_config', message: 'Missing command or URL' }
  if (server.missingEnvKeys.length) {
    return { status: 'missing_env', message: `Missing env: ${server.missingEnvKeys.join(', ')}` }
  }
  if (server.url) return { status: 'healthy', message: 'URL config is present' }
  if (commandLooksResolvable(server.command || '')) {
    return { status: 'healthy', message: 'Command is resolvable' }
  }
  return { status: 'unhealthy', message: 'Command was not found on PATH' }
}

function commandLooksResolvable(command: string): boolean {
  const trimmed = command.trim()
  if (!trimmed) return false
  if (trimmed.includes(path.sep) || trimmed.includes('/')) return fs.existsSync(trimmed)
  try {
    const lookup = process.platform === 'win32' ? 'where.exe' : 'sh'
    const args = process.platform === 'win32' ? [trimmed] : ['-lc', `command -v ${shellQuote(trimmed)}`]
    execFileSync(lookup, args, { stdio: 'ignore', timeout: 1500 })
    return true
  } catch {
    return false
  }
}

function redactUrl(value: string): string {
  try {
    const parsed = new URL(value)
    parsed.username = parsed.username ? 'redacted' : ''
    parsed.password = parsed.password ? 'redacted' : ''
    parsed.search = parsed.search ? '?redacted=1' : ''
    return parsed.toString()
  } catch {
    return value.replace(/([?&](?:token|key|secret|password)=)[^&]+/gi, '$1redacted')
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function formatServer(row: any): McpServerRecord {
  return {
    id: row.id,
    name: row.name,
    source: row.source,
    scope: row.scope,
    projectId: row.project_id ?? null,
    projectPath: row.project_path ?? null,
    command: row.command ?? null,
    url: row.url ?? null,
    args: safeJsonArray(row.args),
    envKeys: safeJsonArray(row.env_keys),
    requiredEnvKeys: safeJsonArray(row.required_env_keys),
    missingEnvKeys: safeJsonArray(row.missing_env_keys),
    status: row.status,
    driftStatus: row.drift_status ?? 'unknown',
    configPath: row.config_path ?? null,
    lastSeenAt: row.last_seen_at,
    lastCheckedAt: row.last_checked_at ?? null,
    healthMessage: row.health_message ?? null,
  }
}

function stripComment(line: string): string {
  let inString = false
  let quote = ''
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if ((char === '"' || char === "'") && line[i - 1] !== '\\') {
      if (!inString) {
        inString = true
        quote = char
      } else if (quote === char) {
        inString = false
        quote = ''
      }
    }
    if (char === '#' && !inString) return line.slice(0, i)
  }
  return line
}

function parseScalar(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.replace(/^["']|["']$/g, '')
}

function parseStringArray(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return []
  return Array.from(trimmed.matchAll(/"([^"]*)"|'([^']*)'/g)).map((match) => match[1] || match[2] || '')
}

function parseInlineEnvKeys(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return []
  return Array.from(trimmed.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*=/g)).map((match) => match[1])
}

function extractEnvRefs(value: string): string[] {
  const refs = new Set<string>()
  for (const match of value.matchAll(/\$\{?([A-Z][A-Z0-9_]{2,})\}?/g)) refs.add(match[1])
  return Array.from(refs)
}

function stableId(scope: string, sourceName: string, projectPath: string, name: string): string {
  const key = `${scope}:${sourceName}:${projectPath}:${name}`.toLowerCase()
  return `mcp_${crypto.createHash('sha1').update(key).digest('hex').slice(0, 16)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
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

function countBy(items: McpServerRecord[], key: (item: McpServerRecord) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const value = key(item)
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {})
}
