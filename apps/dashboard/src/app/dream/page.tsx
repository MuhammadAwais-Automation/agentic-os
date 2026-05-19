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

interface Insight {
  id: string
  type: 'skill' | 'model' | 'memory' | 'graphify'
  title: string
  reason?: string
  roi?: string
  description?: string
  status: 'pending' | 'applied' | 'skipped'
}

interface DreamMeta { lastRun: { ran_at?: number; insights_generated?: number } | null }

const typeTone: Record<string, 'warning' | 'info' | 'success' | 'discovery'> = {
  skill: 'warning',
  model: 'discovery',
  memory: 'info',
  graphify: 'success',
}

function nextRunLabel() {
  const now = new Date()
  const next = new Date()
  next.setHours(2, 0, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)
  const diff = next.getTime() - now.getTime()
  return `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`
}

export default function DreamPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [meta, setMeta] = useState<DreamMeta>({ lastRun: null })
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [filter, setFilter] = useState<'pending' | 'resolved' | 'all'>('pending')
  const [countdown, setCountdown] = useState(nextRunLabel())

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetch(`${BRIDGE_URL}/api/dream/insights`, { headers: authHeaders() }).then(r => r.json())
      setInsights((Array.isArray(data) ? data : (data?.insights ?? [])) as Insight[])
      setMeta({ lastRun: data?.lastRun ?? null })
    } catch {
      setInsights([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const id = setInterval(() => setCountdown(nextRunLabel()), 60000)
    return () => clearInterval(id)
  }, [])

  const runNow = async () => {
    setRunning(true)
    await fetch(`${BRIDGE_URL}/api/dream/run`, { method: 'POST', headers: authHeaders() }).catch(() => {})
    await load()
    setRunning(false)
  }

  const act = async (id: string, status: 'applied' | 'skipped') => {
    await fetch(`${BRIDGE_URL}/api/dream/insights/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    }).catch(() => {})
    setInsights(prev => prev.map(i => i.id === id ? { ...i, status } : i))
  }

  const pending = insights.filter(i => i.status === 'pending')
  const resolved = insights.filter(i => i.status !== 'pending')
  const visible = useMemo(() => {
    if (filter === 'pending') return pending
    if (filter === 'resolved') return resolved
    return insights
  }, [filter, insights, pending, resolved])

  return (
    <PageFrame className="fade-up">
      <PageHeader
        kicker="WORKFLOW COACH"
        title="DREAM ENGINE"
        subtitle={`Next automatic run in ${countdown}${meta.lastRun?.ran_at ? ` / last ${new Date(meta.lastRun.ran_at).toLocaleString()}` : ''}`}
        actions={<ActionButton variant="primary" onClick={runNow} disabled={running}>{running ? 'RUNNING' : 'RUN NOW'}</ActionButton>}
      />

      <div className="auto-grid">
        <GlowCard color="amber" style={{ padding: '16px' }}><Metric label="Pending" value={pending.length} /></GlowCard>
        <GlowCard color="teal" style={{ padding: '16px' }}><Metric label="Resolved" value={resolved.length} /></GlowCard>
        <GlowCard color="purple" style={{ padding: '16px' }}><Metric label="Generated last run" value={meta.lastRun?.insights_generated ?? 0} /></GlowCard>
      </div>

      <GlowCard color="amber" style={{ padding: '14px' }}>
        <div className="segmented-control">
          {(['pending', 'resolved', 'all'] as const).map((item) => (
            <button key={item} data-active={filter === item} onClick={() => setFilter(item)}>{item.toUpperCase()}</button>
          ))}
        </div>
      </GlowCard>

      <div className="panel-list">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} height="96px" />)
          : visible.length === 0
            ? <EmptyState title="No insights in this view" detail="Run Dream Engine to synthesize recommendations from local sessions, memory, skills, and Graphify." action={<ActionButton variant="primary" onClick={runNow}>RUN DREAM</ActionButton>} />
            : visible.map((insight) => (
              <GlowCard key={insight.id} color={insight.status === 'pending' ? 'purple' : 'muted'} style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 420px', minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <StatusPill label={insight.type} tone={typeTone[insight.type] ?? 'info'} />
                      <StatusPill label={insight.status} tone={insight.status === 'pending' ? 'warning' : insight.status === 'applied' ? 'success' : 'neutral'} />
                    </div>
                    <h2 style={{ margin: '12px 0 6px', fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text)' }}>{insight.title}</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.65 }}>{insight.reason || insight.description || 'No evidence text available.'}</p>
                    {insight.roi && <p style={{ margin: '8px 0 0', color: 'var(--brand)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{insight.roi}</p>}
                  </div>
                  {insight.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <ActionButton onClick={() => void act(insight.id, 'applied')}>APPLY</ActionButton>
                      <ActionButton onClick={() => void act(insight.id, 'skipped')}>SKIP</ActionButton>
                    </div>
                  )}
                </div>
              </GlowCard>
            ))
        }
      </div>
    </PageFrame>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <>
      <div className="section-label">{label}</div>
      <div style={{ marginTop: '10px', fontFamily: 'var(--font-display)', fontSize: '40px', color: 'var(--text-strong)' }}>{value}</div>
    </>
  )
}
