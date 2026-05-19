'use client'

import { useEffect, useState } from 'react'
import Badge from '@/components/ui/Badge'
import { AgentRun, listRuns } from '@/lib/runs'

interface RunHistoryPanelProps {
  projectId?: string
  refreshKey: number
  selectedRunId?: string
  onSelect: (run: AgentRun) => void
}

export default function RunHistoryPanel({ projectId, refreshKey, selectedRunId, onSelect }: RunHistoryPanelProps) {
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [error, setError] = useState('')

  const reload = async () => {
    try {
      setRuns(await listRuns(projectId, 30))
      setError('')
    } catch (err) {
      setError(String(err))
    }
  }

  useEffect(() => { void reload() }, [projectId, refreshKey])

  return (
    <div>
      <div style={headerStyle}>RUN HISTORY</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflow: 'auto' }}>
        {runs.map((run) => (
          <button
            key={run.id}
            onClick={() => onSelect(run)}
            style={{
              textAlign: 'left',
              border: `1px solid ${selectedRunId === run.id ? 'rgba(20,184,166,0.55)' : 'var(--border)'}`,
              borderRadius: '3px',
              background: selectedRunId === run.id ? 'rgba(20,184,166,0.08)' : 'rgba(0,0,0,0.22)',
              padding: '10px',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
              <span style={titleStyle}>{run.title || run.command}</span>
              <Badge label={run.status.toUpperCase()} color={statusColor(run.status)} />
            </div>
            <div style={metaStyle}>
              {run.provider} / {formatTime(run.startedAt)} / {run.durationMs ? `${Math.round(run.durationMs / 1000)}s` : 'live'}
            </div>
            {run.lastLog && <div style={snippetStyle}>{run.lastLog.trim()}</div>}
          </button>
        ))}
        {!runs.length && <div style={metaStyle}>No runs yet for this project.</div>}
        {error && <div style={{ ...metaStyle, color: '#ef4444' }}>{error}</div>}
      </div>
    </div>
  )
}

function statusColor(status: string): 'amber' | 'teal' | 'purple' | 'red' | 'muted' {
  if (status === 'running') return 'amber'
  if (status === 'exited') return 'teal'
  if (status === 'cancelled') return 'muted'
  if (status === 'error') return 'red'
  return 'purple'
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const headerStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  letterSpacing: '0.14em',
  marginBottom: '10px',
}

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--text)',
}

const metaStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  marginTop: '6px',
}

const snippetStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  marginTop: '8px',
  maxHeight: '36px',
  overflow: 'hidden',
  whiteSpace: 'pre-wrap',
}
