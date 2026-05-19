'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Command {
  id: string
  category: string
  label: string
  detail: string
  href?: string
  action?: () => void
}

const commands: Command[] = [
  { id: 'nav-home', category: 'Navigate', label: 'Open Mission Control', detail: 'Go to the AI operations overview', href: '/home' },
  { id: 'nav-center', category: 'Navigate', label: 'Open Command Center', detail: 'Run local agents, terminal, Graphify, and replay', href: '/coding' },
  { id: 'nav-approvals', category: 'Navigate', label: 'Open Approvals', detail: 'Review pending agent decisions and risk checkpoints', href: '/approvals' },
  { id: 'nav-sessions', category: 'Navigate', label: 'Open Runs and Sessions', detail: 'Inspect historical AI activity', href: '/sessions' },
  { id: 'nav-memory', category: 'Navigate', label: 'Open Memory', detail: 'Review local knowledge freshness', href: '/memory' },
  { id: 'nav-dream', category: 'Navigate', label: 'Open Dream Engine', detail: 'Review workflow recommendations', href: '/dream' },
  { id: 'nav-mcp', category: 'Navigate', label: 'Open MCP Manager', detail: 'Inspect external tool server health', href: '/mcp' },
  { id: 'nav-catalog', category: 'Navigate', label: 'Open Tool Catalog', detail: 'Browse skills, agents, commands, and rules', href: '/catalog' },
  { id: 'nav-settings', category: 'Navigate', label: 'Open Settings', detail: 'Inspect safe local configuration', href: '/settings' },
  { id: 'action-refresh', category: 'Page', label: 'Refresh Current Page', detail: 'Reload the active dashboard route', action: () => window.location.reload() },
  { id: 'action-setup', category: 'Config', label: 'Open Setup', detail: 'Update first-run configuration inputs', href: '/setup' },
]

export default function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return commands
    return commands.filter((command) =>
      [command.category, command.label, command.detail].some((value) => value.toLowerCase().includes(needle)),
    )
  }, [query])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isPalette = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'
      if (isPalette) {
        event.preventDefault()
        setOpen((value) => !value)
      }
      if (!open) return
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((value) => Math.min(value + 1, Math.max(filtered.length - 1, 0)))
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((value) => Math.max(value - 1, 0))
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        runCommand(filtered[activeIndex])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, filtered, open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, open])

  const runCommand = (command?: Command) => {
    if (!command) return
    if (command.href) router.push(command.href)
    command.action?.()
    setOpen(false)
    setQuery('')
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false)
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.52)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '12vh 16px 0',
      }}
    >
      <div style={{
        width: 'min(720px, 100%)',
        border: '1px solid var(--border-strong)',
        borderRadius: '10px',
        background: 'linear-gradient(180deg, rgba(18,23,34,0.98), rgba(7,8,13,0.98))',
        boxShadow: '0 30px 80px rgba(0,0,0,0.48)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '14px', borderBottom: '1px solid var(--border)' }}>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commands..."
            style={{ fontSize: '14px', minHeight: '42px' }}
          />
        </div>
        <div style={{ maxHeight: '420px', overflow: 'auto', padding: '8px' }}>
          {filtered.map((command, index) => (
            <button
              key={command.id}
              onClick={() => runCommand(command)}
              style={{
                width: '100%',
                textAlign: 'left',
                display: 'grid',
                gridTemplateColumns: '120px minmax(0, 1fr)',
                gap: '12px',
                padding: '12px',
                borderRadius: '6px',
                background: index === activeIndex ? 'rgba(245,158,11,0.1)' : 'transparent',
                border: `1px solid ${index === activeIndex ? 'rgba(245,158,11,0.22)' : 'transparent'}`,
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--brand)', letterSpacing: '0.12em' }}>
                {command.category.toUpperCase()}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text)' }}>
                  {command.label}
                </span>
                <span style={{ display: 'block', marginTop: '3px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {command.detail}
                </span>
              </span>
            </button>
          ))}
          {!filtered.length && (
            <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
              No matching command.
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          <span>Enter to run</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  )
}
