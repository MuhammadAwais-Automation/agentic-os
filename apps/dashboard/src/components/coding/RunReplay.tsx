'use client'

import { useEffect, useState } from 'react'
import { AgentRun, RunLog, loadRunLogs } from '@/lib/runs'

interface RunReplayProps {
  run: AgentRun | null
}

export default function RunReplay({ run }: RunReplayProps) {
  const [logs, setLogs] = useState<RunLog[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!run) {
      setLogs([])
      return
    }
    loadRunLogs(run.id)
      .then((rows) => { setLogs(rows); setError('') })
      .catch((err) => setError(String(err)))
  }, [run])

  if (!run) {
    return (
      <div style={emptyStyle}>Select a run from history to replay its transcript.</div>
    )
  }

  const transcript = logs.map((log) => log.data).join('')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <div style={labelStyle}>RUN REPLAY</div>
          <div style={metaStyle}>{run.provider} / {run.status} / {run.id}</div>
        </div>
        <button
          onClick={() => navigator.clipboard?.writeText(transcript)}
          style={buttonStyle}
        >
          COPY
        </button>
      </div>
      <div style={terminalStyle}>
        {logs.map((log) => (
          <span key={log.id} style={{ color: streamColor(log.stream) }}>
            {log.stream === 'stdin' ? `\n> ${log.data}` : log.data}
          </span>
        ))}
        {!logs.length && !error && <span style={{ color: 'var(--text-muted)' }}>No logs saved for this run.</span>}
        {error && <span style={{ color: '#ef4444' }}>{error}</span>}
      </div>
    </div>
  )
}

function streamColor(stream: string): string {
  if (stream === 'stdin') return 'var(--amber)'
  if (stream === 'system') return 'var(--teal)'
  if (stream === 'stderr') return '#ef4444'
  return 'var(--text)'
}

const emptyStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--text-muted)',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  letterSpacing: '0.14em',
}

const metaStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  marginTop: '4px',
}

const buttonStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid rgba(139,92,246,0.45)',
  borderRadius: '3px',
  background: 'rgba(139,92,246,0.08)',
  color: 'var(--purple)',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.1em',
  cursor: 'pointer',
}

const terminalStyle: React.CSSProperties = {
  maxHeight: '320px',
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  padding: '14px',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  background: 'rgba(0,0,0,0.55)',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  lineHeight: 1.65,
}
