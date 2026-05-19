'use client'

import { useEffect, useState } from 'react'
import ActionButton from '@/components/ui/ActionButton'
import EmptyState from '@/components/ui/EmptyState'
import GlowCard from '@/components/ui/GlowCard'
import PageFrame from '@/components/ui/PageFrame'
import PageHeader from '@/components/ui/PageHeader'
import Skeleton from '@/components/ui/Skeleton'
import StatusPill from '@/components/ui/StatusPill'
import { BRIDGE_URL, authHeaders } from '@/lib/constants'

interface SafeConfig {
  obsidianVaultPath: string
  projectsBasePath: string
  hourlyRate: number
  claudeAvailable: boolean
  codexAvailable: boolean
  authTokenConfigured: boolean
}

export default function SettingsPage() {
  const [config, setConfig] = useState<SafeConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${BRIDGE_URL}/api/config`, { headers: authHeaders() })
      const data = await response.json() as { ok: boolean; config?: SafeConfig; error?: string }
      if (!response.ok || !data.ok || !data.config) throw new Error(data.error || 'Failed to load config')
      setConfig(data.config)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <PageFrame className="fade-up">
      <PageHeader
        kicker="CONTROL PLANE"
        title="SETTINGS"
        subtitle="Safe configuration visibility for local paths, provider availability, and bridge status."
        actions={<ActionButton variant="primary" onClick={() => void load()} disabled={loading}>{loading ? 'LOADING' : 'REFRESH'}</ActionButton>}
      />

      {loading ? (
        <div className="auto-grid">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} height="120px" />)}
        </div>
      ) : error ? (
        <EmptyState title="Settings unavailable" detail={error} />
      ) : config ? (
        <div className="inspector-grid">
          <GlowCard color="amber" style={{ padding: '18px' }}>
            <div className="section-label" style={{ marginBottom: '14px' }}>LOCAL PATHS</div>
            <SettingRow label="Projects base" value={config.projectsBasePath || 'not set'} />
            <SettingRow label="Obsidian vault" value={config.obsidianVaultPath || 'not set'} />
            <p style={noteStyle}>Path editing stays in setup for now; this view avoids accidental config churn.</p>
          </GlowCard>

          <GlowCard color="teal" style={{ padding: '18px' }}>
            <div className="section-label" style={{ marginBottom: '14px' }}>PROVIDERS</div>
            <ProviderRow label="Claude Code" active={config.claudeAvailable} />
            <ProviderRow label="Codex CLI" active={config.codexAvailable} />
            <SettingRow label="Hourly rate" value={`$${config.hourlyRate}/hr`} />
          </GlowCard>

          <GlowCard color="purple" style={{ padding: '18px' }}>
            <div className="section-label" style={{ marginBottom: '14px' }}>SECURITY</div>
            <ProviderRow label="Bridge token" active={config.authTokenConfigured} />
            <p style={noteStyle}>Token value is intentionally hidden. Rotate it from setup when needed.</p>
            <a href="/setup" style={linkButtonStyle}>OPEN SETUP</a>
          </GlowCard>
        </div>
      ) : null}
    </PageFrame>
  )
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={rowStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ProviderRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div style={rowStyle}>
      <span>{label}</span>
      <StatusPill label={active ? 'configured' : 'inactive'} tone={active ? 'success' : 'neutral'} />
    </div>
  )
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '14px',
  borderBottom: '1px solid var(--border)',
  padding: '11px 0',
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--text-muted)',
}

const noteStyle: React.CSSProperties = {
  marginTop: '14px',
  color: 'var(--text-muted)',
  fontSize: '12px',
  lineHeight: 1.6,
}

const linkButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '36px',
  padding: '0 14px',
  marginTop: '14px',
  border: '1px solid rgba(167,139,250,0.45)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--discovery)',
  textDecoration: 'none',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.1em',
}
