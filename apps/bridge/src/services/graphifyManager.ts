import fs from 'fs'
import path from 'path'
import { getDb } from '../db'
import { GraphData, GraphNode, parseGraphReport } from './graphParser'

export type GraphifyStatus = 'missing' | 'partial' | 'ready' | 'stale' | 'building' | 'failed'

export interface GraphifyStatusResponse {
  status: GraphifyStatus
  projectId: string | null
  projectPath: string
  files: {
    graphJson: boolean
    report: boolean
    html: boolean
    manifest: boolean
    cost: boolean
  }
  updatedAt: number | null
  newestSourceAt: number | null
  lastRunId: string | null
  lastError: string | null
  stats: {
    nodes: number
    edges: number
    communities: number
    topNodes: Array<{ id: string; label: string; connections: number; filePath: string; type: string; community: number }>
    fileTypes: Array<{ type: string; count: number }>
    communitiesList: Array<{ community: number; count: number }>
  }
}

const ignoredDirs = new Set(['.git', '.next', 'dist', 'build', 'coverage', 'node_modules', 'graphify-out'])

export function resolveGraphifyProject(projectId?: string, projectPath?: string): { projectId: string | null; projectPath: string } {
  if (projectId) {
    const row = getDb().prepare('SELECT id, path FROM projects WHERE id = ?').get(projectId) as { id: string; path: string } | undefined
    if (!row) throw new Error(`Project not found: ${projectId}`)
    return { projectId: row.id, projectPath: validateProjectPath(row.path) }
  }
  return { projectId: null, projectPath: validateProjectPath(projectPath || '') }
}

export function getGraphifyPaths(projectPath: string) {
  const outDir = path.join(projectPath, 'graphify-out')
  return {
    outDir,
    graphJson: path.join(outDir, 'graph.json'),
    report: path.join(outDir, 'GRAPH_REPORT.md'),
    html: path.join(outDir, 'graph.html'),
    manifest: path.join(outDir, 'manifest.json'),
    cost: path.join(outDir, 'cost.json'),
  }
}

export function getGraphifyStatus(projectId?: string, projectPathInput?: string): GraphifyStatusResponse {
  const project = resolveGraphifyProject(projectId, projectPathInput)
  const paths = getGraphifyPaths(project.projectPath)
  const files = {
    graphJson: fs.existsSync(paths.graphJson),
    report: fs.existsSync(paths.report),
    html: fs.existsSync(paths.html),
    manifest: fs.existsSync(paths.manifest),
    cost: fs.existsSync(paths.cost),
  }
  const graph = files.graphJson || files.report ? parseGraphReport(project.projectPath) : { nodes: [], edges: [] }
  const updatedAt = files.graphJson ? Math.round(fs.statSync(paths.graphJson).mtimeMs) : null
  const newestSourceAt = newestSourceMtime(project.projectPath)
  const projectRow = project.projectId
    ? getDb().prepare('SELECT graphify_building_at, graphify_last_run_id, graphify_last_error FROM projects WHERE id = ?').get(project.projectId) as any
    : null
  const building = projectRow?.graphify_building_at && Date.now() - Number(projectRow.graphify_building_at) < 1000 * 60 * 30

  let status: GraphifyStatus = 'missing'
  if (building) status = 'building'
  else if (!fs.existsSync(paths.outDir)) status = 'missing'
  else if (!files.graphJson || !files.report) status = 'partial'
  else if (updatedAt && newestSourceAt && newestSourceAt > updatedAt) status = 'stale'
  else status = 'ready'
  if (projectRow?.graphify_last_error && status === 'missing') status = 'failed'

  if (project.projectId) persistGraphifyStatus(project.projectId, status, updatedAt)

  return {
    status,
    projectId: project.projectId,
    projectPath: project.projectPath,
    files,
    updatedAt,
    newestSourceAt: newestSourceAt || null,
    lastRunId: projectRow?.graphify_last_run_id ?? null,
    lastError: projectRow?.graphify_last_error ?? null,
    stats: graphStats(graph),
  }
}

export function getGraphifyGraph(projectId?: string, projectPath?: string): GraphData {
  const project = resolveGraphifyProject(projectId, projectPath)
  return parseGraphReport(project.projectPath)
}

export function readGraphifyText(kind: 'report' | 'html', projectId?: string, projectPath?: string): { content: string; path: string; modifiedAt: number } {
  const project = resolveGraphifyProject(projectId, projectPath)
  const paths = getGraphifyPaths(project.projectPath)
  const filePath = kind === 'report' ? paths.report : paths.html
  ensureInsideGraphify(project.projectPath, filePath)
  if (!fs.existsSync(filePath)) throw new Error(`${kind} not found`)
  return {
    content: fs.readFileSync(filePath, 'utf-8'),
    path: filePath,
    modifiedAt: Math.round(fs.statSync(filePath).mtimeMs),
  }
}

export function readGraphifyJson(kind: 'manifest' | 'cost', projectId?: string, projectPath?: string): { data: unknown; path: string; modifiedAt: number } {
  const project = resolveGraphifyProject(projectId, projectPath)
  const paths = getGraphifyPaths(project.projectPath)
  const filePath = kind === 'manifest' ? paths.manifest : paths.cost
  ensureInsideGraphify(project.projectPath, filePath)
  if (!fs.existsSync(filePath)) throw new Error(`${kind} not found`)
  return {
    data: JSON.parse(fs.readFileSync(filePath, 'utf-8')),
    path: filePath,
    modifiedAt: Math.round(fs.statSync(filePath).mtimeMs),
  }
}

export function persistGraphifyStatus(projectId: string, status: GraphifyStatus, updatedAt: number | null, lastRunId?: string | null, lastError?: string | null): void {
  const shouldUpdateError = arguments.length >= 5
  getDb()
    .prepare(`
      UPDATE projects
      SET graphify_status = ?,
          graphify_updated_at = ?,
          graphify_last_run_id = COALESCE(?, graphify_last_run_id),
          graphify_last_error = CASE WHEN ? = 1 THEN ? ELSE graphify_last_error END,
          graphify_building_at = CASE WHEN ? = 'building' THEN COALESCE(graphify_building_at, ?) ELSE NULL END
      WHERE id = ?
    `)
    .run(status, updatedAt, lastRunId ?? null, shouldUpdateError ? 1 : 0, lastError ?? null, status, Date.now(), projectId)
}

function validateProjectPath(projectPath: string): string {
  if (!projectPath) throw new Error('projectPath or projectId required')
  const resolved = path.resolve(projectPath)
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`Project path is not a directory: ${resolved}`)
  }
  return resolved
}

function ensureInsideGraphify(projectPath: string, filePath: string): void {
  const root = path.resolve(projectPath, 'graphify-out')
  const resolved = path.resolve(filePath)
  if (!resolved.startsWith(root)) throw new Error('Refusing to read outside graphify-out')
}

function graphStats(graph: GraphData): GraphifyStatusResponse['stats'] {
  const fileTypeCounts = new Map<string, number>()
  const communityCounts = new Map<number, number>()
  for (const node of graph.nodes) {
    fileTypeCounts.set(node.type, (fileTypeCounts.get(node.type) || 0) + 1)
    communityCounts.set(node.community, (communityCounts.get(node.community) || 0) + 1)
  }
  const topNodes = [...graph.nodes]
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 12)
    .map((node) => pickNode(node))

  return {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    communities: communityCounts.size,
    topNodes,
    fileTypes: [...fileTypeCounts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    communitiesList: [...communityCounts.entries()].map(([community, count]) => ({ community, count })).sort((a, b) => b.count - a.count),
  }
}

function pickNode(node: GraphNode) {
  return {
    id: node.id,
    label: node.label,
    connections: node.connections,
    filePath: node.filePath,
    type: node.type,
    community: node.community,
  }
}

function newestSourceMtime(projectPath: string): number {
  let newest = 0
  const stack = [projectPath]
  while (stack.length) {
    const current = stack.pop()!
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) stack.push(full)
      } else if (entry.isFile() && isSourceFile(entry.name)) {
        try { newest = Math.max(newest, fs.statSync(full).mtimeMs) } catch { /* ignore */ }
      }
    }
  }
  return Math.round(newest)
}

function isSourceFile(filename: string): boolean {
  return /\.(ts|tsx|js|jsx|py|rs|go|java|kt|md|json|toml|yaml|yml|css|scss|html)$/i.test(filename)
}
