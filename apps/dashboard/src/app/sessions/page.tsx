'use client'

import { useEffect, useMemo, useState } from 'react'
import ActionButton from '@/components/ui/ActionButton'
import EmptyState from '@/components/ui/EmptyState'
import GlowCard from '@/components/ui/GlowCard'
import PageFrame from '@/components/ui/PageFrame'
import PageHeader from '@/components/ui/PageHeader'
import Skeleton from '@/components/ui/Skeleton'
import StatusPill from '@/components/ui/StatusPill'
import { BRIDGE_URL, authHeaders } from '@/lib/constants'

interface Session {
  id: string
  project: string
  startTime: string
  duration: number
  tokens: number
  cost: number
  model: string
}

function modelTone(model: string): 'discovery' | 'warning' | 'info' {
  if (model?.toLowerCase().includes('opus')) return 'discovery'
  if (model?.toLowerCase().includes('sonnet')) return 'warning'
  return 'info'
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${BRIDGE_URL}/api/sessions`, { headers: authHeaders() })
      const data = await response.json()
      const list = Array.isArray(data) ? data : Array.isArray(data?.sessions) ? data.sessions : Array.isArray(data?.data) ? data.data : []
      setSessions(list as Session[])
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return sessions
    return sessions.filter((session) =>
      [session.project, session.model].some((value) => value?.toLowerCase().includes(needle)),
    )
  }, [search, sessions])

  const totalCost = filtered.reduce((total, session) => total + (session.cost || 0), 0)
  const totalTokens = filtered.reduce((total, session) => total + (session.tokens || 0), 0)

  return (
    <PageFrame className="fade-up">
      <PageHeader
        kicker="RUN HISTORY"
        title="SESSIONS"
        subtitle={`${filtered.length} shown / ${sessions.length} total`}
        actions={<ActionButton variant="primary" onClick={() => void load()} disabled={loading}>{loading ? 'LOADING' : 'REFRESH'}</ActionButton>}
      />

      <GlowCard color="amber" style={{ padding: '14px' }}>
        <div className="toolbar">
          <label style={{ flex: '1 1 260px' }}>
            <div className="section-label" style={{ marginBottom: '6px' }}>SEARCH</div>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Project or model..." />
          </label>
          <StatusPill label={`$${totalCost.toFixed(2)} cost`} tone="warning" />
          <StatusPill label={`${totalTokens.toLocaleString()} tokens`} tone="info" />
        </div>
      </GlowCard>

      <GlowCard color="teal" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '16px' }}>
            {Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} height="32px" style={{ marginBottom: '10px' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '18px' }}>
            <EmptyState title="No sessions found" detail="Adjust the search term or refresh after running Claude or Codex." />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Date</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Model</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((session) => (
                <tr key={session.id}>
                  <td data-label="Project">{session.project || '-'}</td>
                  <td data-label="Date">{session.startTime ? new Date(session.startTime).toLocaleDateString() : '-'}</td>
                  <td data-label="Tokens" style={{ color: 'var(--info)' }}>{session.tokens?.toLocaleString() ?? '-'}</td>
                  <td data-label="Cost" style={{ color: 'var(--brand)' }}>${(session.cost ?? 0).toFixed(2)}</td>
                  <td data-label="Model"><StatusPill label={session.model?.split('-')[1] ?? session.model ?? '?'} tone={modelTone(session.model)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlowCard>
    </PageFrame>
  )
}
