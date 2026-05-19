import { BRIDGE_URL, authHeaders } from './constants'

export type McpScope = 'user' | 'project' | 'ecc'
export type McpStatus = 'configured' | 'missing_env' | 'invalid_config' | 'healthy' | 'unhealthy'
export type McpDriftStatus = 'matches' | 'missing' | 'extra' | 'changed' | 'unknown'

export interface McpServer {
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

export interface McpSummary {
  total: number
  byStatus: Record<string, number>
  byScope: Record<string, number>
  bySource: Record<string, number>
  byDrift: Record<string, number>
  missingEnv: number
}

export async function listMcpServers(projectId?: string): Promise<McpServer[]> {
  const params = new URLSearchParams()
  if (projectId) params.set('projectId', projectId)
  const response = await fetch(`${BRIDGE_URL}/api/mcp/servers?${params.toString()}`, { headers: authHeaders() })
  const data = await response.json() as { ok: boolean; servers?: McpServer[]; error?: string }
  if (!response.ok || !data.ok) throw new Error(data.error || 'Failed to load MCP servers')
  return data.servers || []
}

export async function loadMcpSummary(projectId?: string): Promise<McpSummary> {
  const params = new URLSearchParams()
  if (projectId) params.set('projectId', projectId)
  const response = await fetch(`${BRIDGE_URL}/api/mcp/summary?${params.toString()}`, { headers: authHeaders() })
  const data = await response.json() as { ok: boolean; summary?: McpSummary; error?: string }
  if (!response.ok || !data.ok || !data.summary) throw new Error(data.error || 'Failed to load MCP summary')
  return data.summary
}

export async function refreshMcpServers(projectId?: string): Promise<number> {
  const response = await fetch(`${BRIDGE_URL}/api/mcp/refresh`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ projectId }),
  })
  const data = await response.json() as { ok: boolean; scanned?: number; error?: string }
  if (!response.ok || !data.ok) throw new Error(data.error || 'Failed to refresh MCP servers')
  return data.scanned || 0
}

export async function checkMcpServer(serverId: string): Promise<McpServer> {
  const response = await fetch(`${BRIDGE_URL}/api/mcp/check`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ serverId }),
  })
  const data = await response.json() as { ok: boolean; server?: McpServer; error?: string }
  if (!response.ok || !data.ok || !data.server) throw new Error(data.error || 'Failed to check MCP server')
  return data.server
}
