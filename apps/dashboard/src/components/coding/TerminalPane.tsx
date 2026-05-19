'use client'

import { useEffect, useRef, useState } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { BRIDGE_WS, getToken } from '@/lib/constants'

type Provider = 'powershell' | 'claude' | 'codex'

interface TerminalPaneProps {
  projectId?: string
  projectPath: string
  provider: Provider
  onRunStarted?: (runId: string) => void
  onRunClosed?: () => void
}

export default function TerminalPane({ projectId, projectPath, provider, onRunStarted, onRunClosed }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<any>(null)
  const fitRef = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState<'idle' | 'connecting' | 'running' | 'closed'>('idle')
  const [runId, setRunId] = useState('')

  const disconnect = () => {
    wsRef.current?.send(JSON.stringify({ type: 'kill' }))
    wsRef.current?.close()
    wsRef.current = null
    setStatus('closed')
  }

  const connect = () => {
    if (!containerRef.current || status === 'connecting' || status === 'running') return
    setStatus('connecting')

    if (!terminalRef.current) {
      const term = new Terminal({
        cursorBlink: true,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12,
        theme: {
          background: '#050507',
          foreground: '#E8E8F0',
          cursor: '#F59E0B',
          selectionBackground: '#8B5CF655',
        },
      })
      const fit = new FitAddon()
      term.loadAddon(fit)
      term.loadAddon(new WebLinksAddon())
      term.open(containerRef.current)
      fit.fit()
      terminalRef.current = term
      fitRef.current = fit
      term.onData((data: string) => {
        wsRef.current?.send(JSON.stringify({ type: 'input', data }))
      })
    } else {
      terminalRef.current.clear()
      fitRef.current?.fit()
    }

    const term = terminalRef.current
    const fit = fitRef.current
    const token = getToken()
    const cols = term.cols || 120
    const rows = term.rows || 32
    const qs = new URLSearchParams({
      token,
      provider,
      projectPath,
      cols: String(cols),
      rows: String(rows),
    })
    if (projectId) qs.set('projectId', projectId)
    const ws = new WebSocket(`${BRIDGE_WS}/ws/terminal?${qs.toString()}`)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('running')
      term.writeln(`\x1b[33m[agentic-os]\x1b[0m connected to ${provider}`)
    }
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as { type: string; data?: string; runId?: string; code?: number; cwd?: string }
        if (msg.type === 'ready') {
          setRunId(msg.runId || '')
          if (msg.runId) onRunStarted?.(msg.runId)
          term.writeln(`\x1b[36m[run ${msg.runId}]\x1b[0m ${msg.cwd || ''}`)
          return
        }
        if (msg.type === 'output') {
          term.write(msg.data || '')
          return
        }
        if (msg.type === 'error') {
          term.writeln(`\r\n\x1b[31m[error]\x1b[0m ${msg.data || ''}`)
          return
        }
        if (msg.type === 'exit') {
          term.writeln(`\r\n\x1b[33m[exit]\x1b[0m code ${msg.code ?? ''}`)
          setStatus('closed')
          onRunClosed?.()
        }
      } catch {
        term.write(String(event.data))
      }
    }
    ws.onerror = () => {
      term.writeln('\r\n\x1b[31m[connection error]\x1b[0m')
      setStatus('closed')
    }
    ws.onclose = () => {
      setStatus('closed')
      onRunClosed?.()
    }

    const onResize = () => {
      fit?.fit()
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
    }
    window.addEventListener('resize', onResize)
    setTimeout(onResize, 50)
  }

  useEffect(() => {
    return () => {
      wsRef.current?.close()
      terminalRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    if (status === 'running') disconnect()
    // Provider/project changes should not silently move a live shell.
    // User can reconnect when ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, projectPath])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '12px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.14em' }}>
            LIVE TERMINAL
          </div>
          {runId && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
              {runId}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: status === 'running' ? 'var(--teal)' : 'var(--text-muted)', letterSpacing: '0.1em' }}>
            {status.toUpperCase()}
          </span>
          {status === 'running' || status === 'connecting' ? (
            <button onClick={disconnect} style={buttonStyle('red')}>KILL</button>
          ) : (
            <button onClick={connect} disabled={!projectPath.trim()} style={buttonStyle('teal')}>START</button>
          )}
        </div>
      </div>
      <div
        ref={containerRef}
        style={{
          height: '420px',
          overflow: 'hidden',
          background: '#050507',
          border: '1px solid var(--border)',
          borderRadius: '3px',
          padding: '8px',
        }}
      />
    </div>
  )
}

function buttonStyle(color: 'teal' | 'red'): React.CSSProperties {
  const cssVar = color === 'teal' ? 'var(--teal)' : '#ef4444'
  const bg = color === 'teal' ? 'rgba(20,184,166,0.1)' : 'rgba(239,68,68,0.08)'
  return {
    padding: '6px 14px',
    border: `1px solid ${color === 'teal' ? 'rgba(20,184,166,0.45)' : 'rgba(239,68,68,0.45)'}`,
    borderRadius: '3px',
    background: bg,
    color: cssVar,
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.1em',
    cursor: 'pointer',
  }
}
