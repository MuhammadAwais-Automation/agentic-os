import { BRIDGE_URL, authHeaders } from './constants'

export type GraphifyStatus = 'unknown' | 'missing' | 'partial' | 'ready' | 'stale' | 'building' | 'failed'

export interface ProjectRecord {
  id: string
  name: string
  path: string
  createdAt: number
  lastOpenedAt: number | null
  framework: string | null
  packageManager: string | null
  gitBranch: string | null
  gitDirty: boolean
  graphifyStatus: GraphifyStatus
  graphifyUpdatedAt: number | null
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const response = await fetch(`${BRIDGE_URL}/api/projects`, { headers: authHeaders() })
  const data = await response.json() as { ok: boolean; projects?: ProjectRecord[]; error?: string }
  if (!response.ok || !data.ok) throw new Error(data.error || 'Failed to load projects')
  return data.projects || []
}

export async function addProject(path: string): Promise<ProjectRecord> {
  const response = await fetch(`${BRIDGE_URL}/api/projects`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ path }),
  })
  const data = await response.json() as { ok: boolean; project?: ProjectRecord; error?: string }
  if (!response.ok || !data.ok || !data.project) throw new Error(data.error || 'Failed to add project')
  return data.project
}

export async function openProject(id: string): Promise<ProjectRecord> {
  const response = await fetch(`${BRIDGE_URL}/api/projects/${id}/open`, {
    method: 'PATCH',
    headers: authHeaders(),
  })
  const data = await response.json() as { ok: boolean; project?: ProjectRecord; error?: string }
  if (!response.ok || !data.ok || !data.project) throw new Error(data.error || 'Failed to open project')
  return data.project
}

export async function refreshProject(id: string): Promise<ProjectRecord> {
  const response = await fetch(`${BRIDGE_URL}/api/projects/${id}/refresh`, {
    method: 'PATCH',
    headers: authHeaders(),
  })
  const data = await response.json() as { ok: boolean; project?: ProjectRecord; error?: string }
  if (!response.ok || !data.ok || !data.project) throw new Error(data.error || 'Failed to refresh project')
  return data.project
}
