import fs from 'fs'
import path from 'path'

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

export function parseGraphReport(projectPath: string): GraphData {
  const graphJsonPath = path.join(projectPath, 'graphify-out', 'graph.json')
  if (fs.existsSync(graphJsonPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(graphJsonPath, 'utf-8'))
      const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : []
      const rawEdges = Array.isArray(raw.links) ? raw.links : Array.isArray(raw.edges) ? raw.edges : []
      const degree = new Map<string, number>()
      for (const edge of rawEdges) {
        const source = String(edge.source ?? '')
        const target = String(edge.target ?? '')
        if (!source || !target) continue
        degree.set(source, (degree.get(source) || 0) + 1)
        degree.set(target, (degree.get(target) || 0) + 1)
      }
      return {
        nodes: rawNodes.map((node: any) => ({
          id: String(node.id ?? node.label ?? node.source_file),
          label: String(node.label ?? node.id ?? node.source_file ?? 'Unknown'),
          type: String(node.file_type ?? node.type ?? 'node'),
          filePath: String(node.source_file ?? node.filePath ?? ''),
          connections: degree.get(String(node.id ?? node.label ?? node.source_file)) || 0,
          community: Number(node.community ?? 0),
        })),
        edges: rawEdges
          .map((edge: any) => ({ source: String(edge.source ?? ''), target: String(edge.target ?? '') }))
          .filter((edge: GraphEdge) => edge.source && edge.target),
      }
    } catch {
      // Fall back to markdown report parser below.
    }
  }

  const reportPath = path.join(projectPath, 'graphify-out', 'GRAPH_REPORT.md')
  if (!fs.existsSync(reportPath)) return { nodes: [], edges: [] }

  const content = fs.readFileSync(reportPath, 'utf-8')
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const nodeMap = new Map<string, GraphNode>()

  // Parse nodes table: | file | connections | community |
  const nodeTableMatch = content.match(/\|[- |]+\|\n([\s\S]*?)(?:\n\n|\n#|$)/)
  if (nodeTableMatch) {
    const rows = nodeTableMatch[1].split('\n').filter(r => r.trim().startsWith('|'))
    for (const row of rows) {
      const cols = row.split('|').map(c => c.trim()).filter(Boolean)
      if (cols.length >= 2) {
        const filePath = cols[0]
        const connections = parseInt(cols[1]) || 0
        const community = parseInt(cols[2]) || 0
        const id = filePath
        const node: GraphNode = { id, label: filePath, type: 'report', filePath, connections, community }
        nodes.push(node)
        nodeMap.set(id, node)
      }
    }
  }

  // Parse edges: lines like "fileA -> fileB" or "fileA --> fileB"
  const edgeRegex = /^(.+?)\s*-+>\s*(.+)$/gm
  let match
  while ((match = edgeRegex.exec(content)) !== null) {
    const source = match[1].trim()
    const target = match[2].trim()
    if (source && target) {
      edges.push({ source, target })
      // Auto-add nodes if not in table
      if (!nodeMap.has(source)) {
        const n: GraphNode = { id: source, label: source, type: 'report', filePath: source, connections: 0, community: 0 }
        nodes.push(n); nodeMap.set(source, n)
      }
      if (!nodeMap.has(target)) {
        const n: GraphNode = { id: target, label: target, type: 'report', filePath: target, connections: 0, community: 0 }
        nodes.push(n); nodeMap.set(target, n)
      }
      nodeMap.get(source)!.connections++
      nodeMap.get(target)!.connections++
    }
  }

  return { nodes, edges }
}

export function graphifyInstalled(projectPath: string): boolean {
  return fs.existsSync(path.join(projectPath, 'graphify-out', 'GRAPH_REPORT.md'))
}
