import { BRIDGE_URL, authHeaders } from './constants'

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

export interface CatalogItemDetail extends CatalogItem {
  preview: string
}

export interface CatalogAttachment {
  id: number
  projectId: string | null
  createdAt: number
  item: CatalogItem
}

export interface CatalogSummary {
  total: number
  byKind: Record<string, number>
  byCategory: Record<string, number>
  bySource: Record<string, number>
  byTarget: Record<string, number>
  codexReady: number
  claudeReady: number
  projectLocal: number
}

export interface CatalogFilters {
  kind?: string
  category?: string
  source?: string
  target?: string
  q?: string
  projectId?: string
}

export async function listCatalogItems(filters: CatalogFilters = {}): Promise<CatalogItem[]> {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) qs.set(key, value)
  }
  const response = await fetch(`${BRIDGE_URL}/api/catalog/items?${qs.toString()}`, { headers: authHeaders() })
  const data = await response.json() as { ok: boolean; items?: CatalogItem[]; error?: string }
  if (!response.ok || !data.ok) throw new Error(data.error || 'Failed to load catalog')
  return data.items || []
}

export async function loadCatalogItem(id: string): Promise<CatalogItemDetail> {
  const response = await fetch(`${BRIDGE_URL}/api/catalog/items/${encodeURIComponent(id)}`, { headers: authHeaders() })
  const data = await response.json() as { ok: boolean; item?: CatalogItemDetail; error?: string }
  if (!response.ok || !data.ok || !data.item) throw new Error(data.error || 'Failed to load catalog item')
  return data.item
}

export async function refreshCatalog(projectId?: string): Promise<number> {
  const response = await fetch(`${BRIDGE_URL}/api/catalog/refresh`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ projectId }),
  })
  const data = await response.json() as { ok: boolean; scanned?: number; error?: string }
  if (!response.ok || !data.ok) throw new Error(data.error || 'Failed to refresh catalog')
  return data.scanned || 0
}

export async function loadCatalogSummary(projectId?: string): Promise<CatalogSummary> {
  const qs = new URLSearchParams()
  if (projectId) qs.set('projectId', projectId)
  const response = await fetch(`${BRIDGE_URL}/api/catalog/summary?${qs.toString()}`, { headers: authHeaders() })
  const data = await response.json() as { ok: boolean; summary?: CatalogSummary; error?: string }
  if (!response.ok || !data.ok || !data.summary) throw new Error(data.error || 'Failed to load catalog summary')
  return data.summary
}

export async function recordCatalogUsage(itemId: string, projectId?: string, runId?: string): Promise<void> {
  const response = await fetch(`${BRIDGE_URL}/api/catalog/usage`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ itemId, projectId, runId }),
  })
  const data = await response.json() as { ok: boolean; error?: string }
  if (!response.ok || !data.ok) throw new Error(data.error || 'Failed to record catalog usage')
}

export async function listPromptAttachments(projectId?: string): Promise<CatalogAttachment[]> {
  const qs = new URLSearchParams()
  if (projectId) qs.set('projectId', projectId)
  const response = await fetch(`${BRIDGE_URL}/api/catalog/attachments?${qs.toString()}`, { headers: authHeaders() })
  const data = await response.json() as { ok: boolean; attachments?: CatalogAttachment[]; error?: string }
  if (!response.ok || !data.ok) throw new Error(data.error || 'Failed to load attachments')
  return data.attachments || []
}

export async function attachCatalogItem(itemId: string, projectId?: string): Promise<void> {
  const response = await fetch(`${BRIDGE_URL}/api/catalog/attachments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ itemId, projectId }),
  })
  const data = await response.json() as { ok: boolean; error?: string }
  if (!response.ok || !data.ok) throw new Error(data.error || 'Failed to attach item')
}

export async function removeCatalogAttachment(id: number): Promise<void> {
  const response = await fetch(`${BRIDGE_URL}/api/catalog/attachments/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  const data = await response.json() as { ok: boolean; error?: string }
  if (!response.ok || !data.ok) throw new Error(data.error || 'Failed to remove attachment')
}
