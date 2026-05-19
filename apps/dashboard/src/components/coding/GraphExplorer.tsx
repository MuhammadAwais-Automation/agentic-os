'use client'

import { useMemo, useState } from 'react'
import Badge from '@/components/ui/Badge'
import { GraphData, GraphNode } from '@/lib/graphify'

interface GraphExplorerProps {
  graph: GraphData
  selectedNode: GraphNode | null
  onSelectNode: (node: GraphNode) => void
}

export default function GraphExplorer({ graph, selectedNode, onSelectNode }: GraphExplorerProps) {
  const [query, setQuery] = useState('')
  const [community, setCommunity] = useState('all')
  const communities = useMemo(() => Array.from(new Set(graph.nodes.map((node) => node.community))).sort((a, b) => a - b), [graph.nodes])
  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return graph.nodes
      .filter((node) => community === 'all' || String(node.community) === community)
      .filter((node) => !q || node.label.toLowerCase().includes(q) || node.filePath.toLowerCase().includes(q))
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 80)
  }, [graph.nodes, query, community])
  const neighbors = useMemo(() => {
    if (!selectedNode) return []
    const ids = new Set<string>()
    for (const edge of graph.edges) {
      if (edge.source === selectedNode.id) ids.add(edge.target)
      if (edge.target === selectedNode.id) ids.add(edge.source)
    }
    return graph.nodes.filter((node) => ids.has(node.id)).sort((a, b) => b.connections - a.connections).slice(0, 20)
  }, [graph, selectedNode])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={labelStyle}>GRAPH EXPLORER</div>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search node/path..." />
      <select value={community} onChange={(event) => setCommunity(event.target.value)}>
        <option value="all">All communities</option>
        {communities.map((item) => <option key={item} value={item}>Community {item}</option>)}
      </select>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflow: 'auto' }}>
        {filtered.map((node) => (
          <button key={node.id} onClick={() => onSelectNode(node)} style={nodeButton(node.id === selectedNode?.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span>{node.label}</span>
              <Badge label={String(node.connections)} color="muted" />
            </div>
            <div style={mutedStyle}>{node.type} / c{node.community}</div>
          </button>
        ))}
      </div>
      {selectedNode && (
        <div style={detailBox}>
          <div style={labelStyle}>SELECTED</div>
          <div style={titleStyle}>{selectedNode.label}</div>
          <div style={mutedStyle}>{selectedNode.filePath || selectedNode.id}</div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            <Badge label={selectedNode.type} color="purple" />
            <Badge label={`c${selectedNode.community}`} color="teal" />
            <Badge label={`${selectedNode.connections} links`} color="amber" />
          </div>
          <div style={{ ...labelStyle, marginTop: '12px' }}>NEIGHBORS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflow: 'auto' }}>
            {neighbors.map((node) => (
              <button key={node.id} onClick={() => onSelectNode(node)} style={neighborButton}>{node.label}</button>
            ))}
            {!neighbors.length && <span style={mutedStyle}>No direct neighbors.</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function nodeButton(active: boolean): React.CSSProperties {
  return {
    border: `1px solid ${active ? 'rgba(245,158,11,0.55)' : 'var(--border)'}`,
    background: active ? 'rgba(245,158,11,0.08)' : 'rgba(0,0,0,0.22)',
    borderRadius: '3px',
    padding: '8px',
    color: 'var(--text)',
    textAlign: 'left',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    cursor: 'pointer',
  }
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  letterSpacing: '0.14em',
}
const mutedStyle: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', overflowWrap: 'anywhere' }
const titleStyle: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text)', marginTop: '8px', overflowWrap: 'anywhere' }
const detailBox: React.CSSProperties = { padding: '10px', border: '1px solid var(--border)', borderRadius: '3px', background: 'rgba(0,0,0,0.24)' }
const neighborButton: React.CSSProperties = { ...mutedStyle, textAlign: 'left', background: 'transparent', border: '0', cursor: 'pointer', padding: '2px 0' }
