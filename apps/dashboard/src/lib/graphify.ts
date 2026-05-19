import { BRIDGE_URL, BRIDGE_WS, authHeaders, getToken } from './constants'

export interface GraphNode {
  id: string
  label: string
  type: string
  filePath: string
  connections: number
  community: number
}

export interface GraphEdge {
  source: string
  target: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface GraphifyStatusResponse {
  status: 'missing' | 'partial' | 'ready' | 'stale' | 'building' | 'failed'
  projectId: string | null
  projectPath: string
  files: { graphJson: boolean; report: boolean; html: boolean; manifest: boolean; cost: boolean }
  updatedAt: number | null
  newestSourceAt: number | null
  lastRunId: string | null
  lastError: string | null
  stats: {
    nodes: number
    edges: number
    communities: number
    topNodes: GraphNode[]
    fileTypes: Array<{ type: string; count: number }>
    communitiesList: Array<{ community: number; count: number }>
  }
}

export async function loadGraphifyStatus(projectId: string): Promise<GraphifyStatusResponse> {
  const response = await fetch(`${BRIDGE_URL}/api/graphify/status?projectId=${encodeURIComponent(projectId)}`, { headers: authHeaders() })
  const data = await response.json() as { ok: boolean; status?: GraphifyStatusResponse; error?: string }
  if (!response.ok || !data.ok || !data.status) throw new Error(data.error || 'Failed to load Graphify status')
  return data.status
}

export async function loadGraphifyGraph(projectId: string): Promise<GraphData> {
  const response = await fetch(`${BRIDGE_URL}/api/graphify/graph?projectId=${encodeURIComponent(projectId)}`, { headers: authHeaders() })
  const data = await response.json() as { ok: boolean; graph?: GraphData; error?: string }
  if (!response.ok || !data.ok || !data.graph) throw new Error(data.error || 'Failed to load Graphify graph')
  return data.graph
}

export async function loadGraphifyReport(projectId: string): Promise<string> {
  const response = await fetch(`${BRIDGE_URL}/api/graphify/report?projectId=${encodeURIComponent(projectId)}`, { headers: authHeaders() })
  const data = await response.json() as { ok: boolean; report?: { content: string }; error?: string }
  if (!response.ok || !data.ok || !data.report) throw new Error(data.error || 'Failed to load Graphify report')
  return data.report.content
}

export async function loadGraphifyHtml(projectId: string): Promise<string> {
  const response = await fetch(`${BRIDGE_URL}/api/graphify/html?projectId=${encodeURIComponent(projectId)}`, { headers: authHeaders() })
  const data = await response.json() as { ok: boolean; html?: { content: string }; error?: string }
  if (!response.ok || !data.ok || !data.html) throw new Error(data.error || 'Failed to load Graphify HTML')
  return data.html.content
}

export async function loadGraphifyManifest(projectId: string): Promise<unknown> {
  const response = await fetch(`${BRIDGE_URL}/api/graphify/manifest?projectId=${encodeURIComponent(projectId)}`, { headers: authHeaders() })
  const data = await response.json() as { ok: boolean; manifest?: { data: unknown }; error?: string }
  if (!response.ok || !data.ok || !data.manifest) throw new Error(data.error || 'Failed to load Graphify manifest')
  return data.manifest.data
}

export function openGraphifyRun(projectId: string, action: 'install' | 'build' | 'update'): WebSocket {
  const qs = new URLSearchParams({ token: getToken(), projectId, action })
  return new WebSocket(`${BRIDGE_WS}/ws/graphify-run?${qs.toString()}`)
}
