'use client'

import { useEffect, useState } from 'react'
import Badge from '@/components/ui/Badge'
import { GraphData, GraphifyStatusResponse, loadGraphifyGraph, loadGraphifyHtml, loadGraphifyManifest, loadGraphifyReport, loadGraphifyStatus, openGraphifyRun } from '@/lib/graphify'

interface GraphifyPanelProps {
  projectId?: string
  onGraphLoaded: (graph: GraphData) => void
  onStatusLoaded: (status: GraphifyStatusResponse | null) => void
  onRunFinished: () => void
}

export default function GraphifyPanel({ projectId, onGraphLoaded, onStatusLoaded, onRunFinished }: GraphifyPanelProps) {
  const [status, setStatus] = useState<GraphifyStatusResponse | null>(null)
  const [log, setLog] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  const refresh = async () => {
    if (!projectId) return
    try {
      const [nextStatus, graph] = await Promise.all([
        loadGraphifyStatus(projectId),
        loadGraphifyGraph(projectId).catch(() => ({ nodes: [], edges: [] })),
      ])
      setStatus(nextStatus)
      onStatusLoaded(nextStatus)
      onGraphLoaded(graph)
      setError('')
    } catch (err) {
      setError(String(err))
      onStatusLoaded(null)
      onGraphLoaded({ nodes: [], edges: [] })
    }
  }

  useEffect(() => { void refresh() }, [projectId])

  const run = (action: 'install' | 'build' | 'update') => {
    if (!projectId || running) return
    setRunning(true)
    setLog('')
    const ws = openGraphifyRun(projectId, action)
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as { type: string; data?: string; runId?: string; code?: number }
      if (msg.type === 'ready') setLog((prev) => prev + `[run ${msg.runId}]\n`)
      if (msg.type === 'stdout' || msg.type === 'stderr') setLog((prev) => prev + (msg.data || ''))
      if (msg.type === 'error') setLog((prev) => prev + `\n[error] ${msg.data || ''}\n`)
      if (msg.type === 'done') setLog((prev) => prev + `\n[done] code ${msg.code}\n`)
    }
    ws.onclose = () => {
      setRunning(false)
      void refresh()
      onRunFinished()
    }
    ws.onerror = () => {
      setRunning(false)
      setLog((prev) => prev + '\n[connection error]\n')
    }
  }

  if (!projectId) {
    return <div style={mutedStyle}>Select a project to load Graphify.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <div style={labelStyle}>GRAPHIFY MANAGER</div>
        {status && <Badge label={status.status} color={statusColor(status.status)} />}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
        <Stat label="NODES" value={status?.stats.nodes ?? 0} />
        <Stat label="EDGES" value={status?.stats.edges ?? 0} />
        <Stat label="COMMUNITIES" value={status?.stats.communities ?? 0} />
      </div>
      {status?.lastError && <div style={{ ...mutedStyle, color: '#ef4444' }}>{status.lastError}</div>}
      {status && status.status === 'stale' && (
        <div style={mutedStyle}>Source files are newer than graph.json. Update recommended.</div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button onClick={() => void refresh()} style={buttonStyle('purple')}>REFRESH</button>
        {shouldShowBuild(status?.status) && (
          <button onClick={() => run('build')} disabled={running} style={buttonStyle('teal')}>BUILD GRAPH</button>
        )}
        {shouldShowUpdate(status?.status) && (
          <button onClick={() => run('update')} disabled={running} style={buttonStyle('amber')}>UPDATE GRAPH</button>
        )}
        {shouldShowInstall(status?.status) && (
          <button onClick={() => run('install')} disabled={running} style={buttonStyle('purple')}>INSTALL HOOK</button>
        )}
      </div>
      {status?.stats.topNodes.length ? (
        <div>
          <div style={labelStyle}>TOP NODES</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {status.stats.topNodes.slice(0, 8).map((node) => (
              <Badge key={node.id} label={`${node.label.slice(0, 18)} ${node.connections}`} color="muted" />
            ))}
          </div>
        </div>
      ) : null}
      {log && <pre style={logStyle}>{log}</pre>}
      {error && <div style={{ ...mutedStyle, color: '#ef4444' }}>{error}</div>}
    </div>
  )
}

function shouldShowBuild(status?: string): boolean {
  return !status || status === 'missing' || status === 'partial' || status === 'failed'
}

function shouldShowUpdate(status?: string): boolean {
  return status === 'ready' || status === 'stale' || status === 'building'
}

function shouldShowInstall(status?: string): boolean {
  return status === 'missing'
}

export async function loadGraphifyAssets(projectId: string) {
  const [report, html, manifest] = await Promise.all([
    loadGraphifyReport(projectId).catch(() => ''),
    loadGraphifyHtml(projectId).catch(() => ''),
    loadGraphifyManifest(projectId).catch(() => null),
  ])
  return { report, html, manifest }
}

function statusColor(status: string): 'amber' | 'teal' | 'purple' | 'red' | 'muted' {
  if (status === 'ready') return 'teal'
  if (status === 'stale' || status === 'building') return 'amber'
  if (status === 'failed') return 'red'
  if (status === 'partial') return 'purple'
  return 'muted'
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={statBox}>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

function buttonStyle(color: 'amber' | 'teal' | 'purple'): React.CSSProperties {
  const cssVar = color === 'amber' ? 'var(--amber)' : color === 'teal' ? 'var(--teal)' : 'var(--purple)'
  return {
    padding: '6px 12px',
    border: `1px solid ${cssVar}`,
    borderRadius: '3px',
    background: 'rgba(255,255,255,0.03)',
    color: cssVar,
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.1em',
    cursor: 'pointer',
  }
}

const labelStyle: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.14em' }
const mutedStyle: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }
const statBox: React.CSSProperties = { padding: '10px', border: '1px solid var(--border)', borderRadius: '3px', background: 'rgba(0,0,0,0.22)' }
const logStyle: React.CSSProperties = { maxHeight: '160px', overflow: 'auto', whiteSpace: 'pre-wrap', padding: '10px', border: '1px solid var(--border)', borderRadius: '3px', background: 'rgba(0,0,0,0.45)', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text)' }
