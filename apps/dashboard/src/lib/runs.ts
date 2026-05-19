import { BRIDGE_URL, authHeaders } from './constants'

export interface AgentRun {
  id: string
  provider: string
  projectId: string | null
  projectPath: string
  projectName: string | null
  command: string
  status: string
  startedAt: number
  endedAt: number | null
  durationMs: number | null
  exitCode: number | null
  mode: string
  title: string | null
  lastLog: string
}

export interface RunLog {
  id: number
  runId: string
  ts: number
  stream: string
  data: string
}

export async function listRuns(projectId?: string, limit = 50): Promise<AgentRun[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (projectId) params.set('projectId', projectId)
  const response = await fetch(`${BRIDGE_URL}/api/runs?${params.toString()}`, { headers: authHeaders() })
  const data = await response.json() as { ok: boolean; runs?: AgentRun[]; error?: string }
  if (!response.ok || !data.ok) throw new Error(data.error || 'Failed to load runs')
  return data.runs || []
}

export async function loadRunLogs(runId: string): Promise<RunLog[]> {
  const response = await fetch(`${BRIDGE_URL}/api/runs/${runId}/logs`, { headers: authHeaders() })
  const data = await response.json() as { ok: boolean; logs?: RunLog[]; error?: string }
  if (!response.ok || !data.ok) throw new Error(data.error || 'Failed to load run logs')
  return data.logs || []
}
