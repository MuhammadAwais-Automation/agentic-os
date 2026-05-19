'use client'

import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import AnimatedCounter from '@/components/ui/AnimatedCounter'
import ActionButton from '@/components/ui/ActionButton'
import EmptyState from '@/components/ui/EmptyState'
import GlowCard from '@/components/ui/GlowCard'
import PageFrame from '@/components/ui/PageFrame'
import PageHeader from '@/components/ui/PageHeader'
import Skeleton from '@/components/ui/Skeleton'
import StatCard from '@/components/ui/StatCard'
import StatusPill from '@/components/ui/StatusPill'
import { BRIDGE_URL, authHeaders } from '@/lib/constants'
import { McpSummary, loadMcpSummary } from '@/lib/mcp'
import { AgentRun, listRuns } from '@/lib/runs'

interface TodayStats {
  session_count: number
  total_tokens: number
  total_cost: number
  duration_ms: number
}

interface WeeklyPoint {
  day: string
  cost: number
}

interface QuotaWindow {
  used_tokens: number
  resets_at_iso: string
}

interface ProviderLimit {
  used_percent: number
  window_minutes: number
  resets_at: number
}

interface UsageLimits {
  claude: {
    available: boolean
    tokens_used_today: number
    cost_today: number
    sessions_today: number
    quota?: {
      four_hour: QuotaWindow
      weekly: QuotaWindow
    }
  }
  codex: {
    available: boolean
    primary: ProviderLimit | null
    secondary: ProviderLimit | null
  }
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

function formatDuration(ms: number): string {
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`
}

function formatReset(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function HomePage() {
  const [today, setToday] = useState<TodayStats | null>(null)
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([])
  const [limits, setLimits] = useState<UsageLimits | null>(null)
  const [mcpSummary, setMcpSummary] = useState<McpSummary | null>(null)
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [t, w, l, mcp, recentRuns] = await Promise.all([
        fetch(`${BRIDGE_URL}/api/sessions/today`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${BRIDGE_URL}/api/sessions/weekly`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${BRIDGE_URL}/api/sessions/limits`, { headers: authHeaders() }).then(r => r.json()),
        loadMcpSummary().catch(() => null),
        listRuns(undefined, 8).catch(() => []),
      ])
      setToday(t as TodayStats)
      setWeekly((Array.isArray(w) ? w : (w?.data ?? [])) as WeeklyPoint[])
      if (l?.ok) setLimits(l as UsageLimits)
      setMcpSummary(mcp)
      setRuns(recentRuns)
    } catch {
      // Keep the shell usable when the bridge is offline.
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const failedRuns = runs.filter((run) => ['error', 'failed'].includes(run.status) || (run.exitCode ?? 0) > 0)
  const runningRuns = runs.filter((run) => run.status === 'running')
  const mcpWarnings = (mcpSummary?.byStatus.missing_env ?? 0) + (mcpSummary?.byStatus.invalid_config ?? 0) + (mcpSummary?.byStatus.unhealthy ?? 0)

  const attentionItems = useMemo(() => {
    const items: Array<{ label: string; detail: string; tone: 'success' | 'warning' | 'danger' | 'info' }> = []
    if (runningRuns.length) items.push({ label: `${runningRuns.length} active run${runningRuns.length === 1 ? '' : 's'}`, detail: 'Agent work is currently live.', tone: 'info' })
    if (failedRuns.length) items.push({ label: `${failedRuns.length} failed recent run${failedRuns.length === 1 ? '' : 's'}`, detail: 'Open run replay before starting the next fix.', tone: 'danger' })
    if (mcpWarnings) items.push({ label: `${mcpWarnings} MCP warning${mcpWarnings === 1 ? '' : 's'}`, detail: 'Missing env or invalid tool config needs attention.', tone: 'warning' })
    if (!items.length) items.push({ label: 'Systems nominal', detail: 'No failed recent runs or MCP warnings found.', tone: 'success' })
    return items
  }, [failedRuns.length, mcpWarnings, runningRuns.length])

  return (
    <PageFrame className="fade-up">
      <PageHeader
        kicker="AI OPERATIONS"
        title="MISSION CONTROL"
        subtitle="Runs, costs, limits, tool health, and the next thing that needs attention."
        actions={<ActionButton variant="primary" onClick={() => void load()} disabled={loading}>{loading ? 'REFRESHING' : 'REFRESH'}</ActionButton>}
      />

      <div className="auto-grid">
        <StatCard
          label="SESSIONS TODAY"
          tone="amber"
          value={loading ? <Skeleton height="34px" width="80px" /> : <AnimatedCounter value={today?.session_count ?? 0} />}
          detail="Local Claude/Codex activity"
        />
        <StatCard
          label="TOKENS USED"
          tone="teal"
          value={loading ? <Skeleton height="34px" width="96px" /> : formatTokens(today?.total_tokens ?? 0)}
          detail={today ? `${formatDuration(today.duration_ms || 0)} session time` : 'Waiting for bridge data'}
        />
        <StatCard
          label="MCP HEALTH"
          tone={mcpWarnings ? 'amber' : 'teal'}
          value={loading ? <Skeleton height="34px" width="72px" /> : `${mcpSummary?.total ?? 0}`}
          detail={mcpWarnings ? `${mcpWarnings} warning${mcpWarnings === 1 ? '' : 's'}` : 'No warnings detected'}
        />
      </div>

      <div className="two-column-grid">
        <GlowCard color="amber" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div className="section-label">ATTENTION QUEUE</div>
              <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>Operational signals that should shape the next action.</p>
            </div>
            <StatusPill label={`${attentionItems.length} signal${attentionItems.length === 1 ? '' : 's'}`} tone={attentionItems.some(i => i.tone === 'danger') ? 'danger' : 'info'} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {attentionItems.map((item) => (
              <div key={item.label} className="attention-row" style={attentionRowStyle}>
                <StatusPill label={item.label} tone={item.tone} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{item.detail}</span>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard color="teal" style={{ padding: '18px' }}>
          <div className="section-label" style={{ marginBottom: '14px' }}>RECENT RUNS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {loading
              ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} height="34px" />)
              : runs.length
                ? runs.slice(0, 5).map((run) => (
                  <div key={run.id} style={runRowStyle}>
                    <div style={{ minWidth: 0 }}>
                      <div style={runTitleStyle}>{run.title || run.command}</div>
                      <div style={runMetaStyle}>{run.provider} / {run.projectName || 'global'} / {new Date(run.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <StatusPill label={run.status} tone={run.status === 'running' ? 'info' : run.status === 'exited' ? 'success' : run.status === 'error' ? 'danger' : 'neutral'} />
                  </div>
                ))
                : <EmptyState title="No runs yet" detail="Start a terminal session from Command Center to populate this stream." />
            }
          </div>
        </GlowCard>
      </div>

      <div className="two-column-grid">
        <GlowCard color="amber" style={{ padding: '18px' }}>
          <div className="section-label" style={{ marginBottom: '18px' }}>7-DAY COST TREND</div>
          {loading ? <Skeleton height="190px" /> : (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={weekly} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'rgba(216,222,233,0.58)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'rgba(216,222,233,0.58)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(7,8,13,0.96)', border: '1px solid rgba(245,158,11,0.24)', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
                  labelStyle={{ color: 'var(--amber)' }}
                  itemStyle={{ color: 'var(--text)' }}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cost']}
                />
                <Area type="monotone" dataKey="cost" stroke="#F59E0B" strokeWidth={1.6} fill="url(#amberGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </GlowCard>

        <GlowCard color="purple" style={{ padding: '18px' }}>
          <div className="section-label" style={{ marginBottom: '16px' }}>PROVIDER LIMITS</div>
          {loading ? <Skeleton height="160px" /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <UsageBarGroup
                label="Claude Code"
                active={Boolean(limits?.claude?.available)}
                bars={[
                  {
                    key: '4h window',
                    pct: limits?.claude?.quota?.four_hour
                      ? Math.min(100, (limits.claude.quota.four_hour.used_tokens / 88000) * 100)
                      : null,
                    value: limits?.claude?.quota?.four_hour ? formatTokens(limits.claude.quota.four_hour.used_tokens) : '-',
                    reset: limits?.claude?.quota?.four_hour ? formatReset(limits.claude.quota.four_hour.resets_at_iso) : null,
                    color: 'var(--amber)',
                  },
                  {
                    key: 'weekly',
                    pct: limits?.claude?.quota?.weekly
                      ? Math.min(100, (limits.claude.quota.weekly.used_tokens / 1000000) * 100)
                      : null,
                    value: limits?.claude?.quota?.weekly ? formatTokens(limits.claude.quota.weekly.used_tokens) : '-',
                    reset: limits?.claude?.quota?.weekly ? formatReset(limits.claude.quota.weekly.resets_at_iso) : null,
                    color: 'var(--amber)',
                  },
                ]}
              />
              <UsageBarGroup
                label="Codex"
                active={Boolean(limits?.codex?.available)}
                bars={[
                  {
                    key: '4h window',
                    pct: limits?.codex?.primary?.used_percent ?? null,
                    value: limits?.codex?.primary ? `${limits.codex.primary.used_percent.toFixed(1)}%` : '-',
                    reset: limits?.codex?.primary ? formatReset(new Date(limits.codex.primary.resets_at * 1000).toISOString()) : null,
                    color: 'var(--purple)',
                  },
                  {
                    key: 'weekly',
                    pct: limits?.codex?.secondary?.used_percent ?? null,
                    value: limits?.codex?.secondary ? `${limits.codex.secondary.used_percent.toFixed(1)}%` : '-',
                    reset: limits?.codex?.secondary ? formatReset(new Date(limits.codex.secondary.resets_at * 1000).toISOString()) : null,
                    color: 'var(--purple)',
                  },
                ]}
              />
            </div>
          )}
        </GlowCard>
      </div>

    </PageFrame>
  )
}

interface UsageBar {
  key: string
  pct: number | null
  value: string
  reset: string | null
  color: string
}

function UsageBarGroup({ label, active, bars }: { label: string; active: boolean; bars: UsageBar[] }) {
  return (
    <div style={providerCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text)', letterSpacing: '0.08em' }}>{label}</span>
        <StatusPill label={active ? 'active' : 'offline'} tone={active ? 'success' : 'neutral'} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {bars.map(bar => {
          const pct = bar.pct ?? 0
          const barColor = pct > 85 ? 'var(--danger)' : pct > 60 ? 'var(--warning)' : bar.color
          return (
            <div key={bar.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{bar.key}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                  <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text)' }}>{bar.value}</strong>
                  {bar.reset && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-faint)' }}>↺ {bar.reset}</span>
                  )}
                </div>
              </div>
              <div className="usage-bar-track">
                <div
                  className="usage-bar-fill"
                  style={{
                    width: bar.pct !== null ? `${pct}%` : '0%',
                    background: bar.pct !== null
                      ? `linear-gradient(90deg, ${barColor}, ${barColor}88)`
                      : 'var(--border)',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const attentionRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexDirection: 'column',
  gap: '12px',
  padding: '10px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(216,222,233,0.025)',
}

const runRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
  padding: '10px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(0,0,0,0.18)',
}

const runTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--text)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const runMetaStyle: React.CSSProperties = {
  marginTop: '4px',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--text-muted)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const providerCardStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(0,0,0,0.18)',
  padding: '12px',
}

