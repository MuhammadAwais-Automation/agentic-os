'use client'

import { useEffect, useMemo, useState } from 'react'
import GlowCard from '@/components/ui/GlowCard'
import Badge from '@/components/ui/Badge'
import PageFrame from '@/components/ui/PageFrame'
import PageHeader from '@/components/ui/PageHeader'
import McpEnvWarnings from '@/components/mcp/McpEnvWarnings'
import McpServerDetail from '@/components/mcp/McpServerDetail'
import McpServerList from '@/components/mcp/McpServerList'
import McpSummary from '@/components/mcp/McpSummary'
import {
  checkMcpServer,
  listMcpServers,
  loadMcpSummary,
  McpServer,
  McpSummary as Summary,
  refreshMcpServers,
} from '@/lib/mcp'
import { listProjects, ProjectRecord } from '@/lib/projects'

export default function McpPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [projectId, setProjectId] = useState('')
  const [servers, setServers] = useState<McpServer[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [selected, setSelected] = useState<McpServer | null>(null)
  const [q, setQ] = useState('')
  const [scope, setScope] = useState('')
  const [status, setStatus] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [checkingId, setCheckingId] = useState('')
  const [message, setMessage] = useState('')

  const activeProjectId = projectId || undefined

  const load = async () => {
    const [nextServers, nextSummary] = await Promise.all([
      listMcpServers(activeProjectId),
      loadMcpSummary(activeProjectId),
    ])
    setServers(nextServers)
    setSummary(nextSummary)
    setSelected((current) => current ? nextServers.find((server) => server.id === current.id) || null : nextServers[0] || null)
  }

  useEffect(() => {
    listProjects().then(setProjects).catch(() => setProjects([]))
  }, [])

  useEffect(() => {
    void load().catch((err) => setMessage(String(err)))
  }, [projectId])

  const filteredServers = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return servers.filter((server) => {
      if (scope && server.scope !== scope) return false
      if (status && server.status !== status) return false
      if (!needle) return true
      return [server.name, server.source, server.command || '', server.url || '', server.configPath || '']
        .some((value) => value.toLowerCase().includes(needle))
    })
  }, [q, scope, status, servers])

  const refresh = async () => {
    setRefreshing(true)
    setMessage('')
    try {
      const scanned = await refreshMcpServers(activeProjectId)
      setMessage(`Scanned ${scanned} MCP server${scanned === 1 ? '' : 's'}.`)
      await load()
    } catch (err) {
      setMessage(String(err))
    } finally {
      setRefreshing(false)
    }
  }

  const check = async (serverId: string) => {
    setCheckingId(serverId)
    setMessage('')
    try {
      const checked = await checkMcpServer(serverId)
      setServers((current) => current.map((server) => server.id === checked.id ? checked : server))
      setSelected(checked)
      setMessage(`Checked ${checked.name}: ${checked.status.replace('_', ' ')}.`)
      setSummary(await loadMcpSummary(activeProjectId))
    } catch (err) {
      setMessage(String(err))
    } finally {
      setCheckingId('')
    }
  }

  return (
    <PageFrame className="fade-up">
      <PageHeader
        kicker="TOOL CONNECTORS"
        title="MCP MANAGER"
        subtitle="Config visibility, safe health checks, env warnings, and drift status."
        actions={
        <label style={{ width: '320px', maxWidth: '100%' }}>
          <div style={labelStyle}>PROJECT CONTEXT</div>
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">Global MCP view</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
        }
      />

      <GlowCard color="amber" style={{ padding: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) repeat(2, minmax(130px, 170px)) auto', gap: '10px', alignItems: 'end' }}>
          <label>
            <div style={labelStyle}>SEARCH</div>
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="context7, github, playwright..." />
          </label>
          <Select label="SCOPE" value={scope} onChange={setScope} options={['', 'user', 'project', 'ecc']} />
          <Select label="STATUS" value={status} onChange={setStatus} options={['', 'configured', 'healthy', 'missing_env', 'invalid_config', 'unhealthy']} />
          <button onClick={refresh} disabled={refreshing} style={buttonStyle}>{refreshing ? 'SCANNING' : 'REFRESH'}</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
          <div style={messageStyle}>{message || 'Secrets are redacted. Only env key names and status are shown.'}</div>
          <Badge label={`${filteredServers.length} shown`} color="muted" />
        </div>
      </GlowCard>

      <McpSummary summary={summary} />

      <div className="inspector-grid">
        <GlowCard color="teal" style={{ padding: '14px' }}>
          <div style={sectionLabel}>MCP SERVERS</div>
          <McpServerList servers={filteredServers} selectedId={selected?.id} onSelect={setSelected} />
        </GlowCard>

        <GlowCard color="purple" style={{ padding: '14px' }}>
          <McpServerDetail server={selected} checking={checkingId === selected?.id} onCheck={check} />
        </GlowCard>

        <GlowCard color="amber" style={{ padding: '14px' }}>
          <McpEnvWarnings servers={servers} />
        </GlowCard>
      </div>
    </PageFrame>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label>
      <div style={labelStyle}>{label}</div>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((item) => <option key={item || 'all'} value={item}>{item || 'all'}</option>)}
      </select>
    </label>
  )
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  letterSpacing: '0.14em',
  marginBottom: '5px',
}

const sectionLabel: React.CSSProperties = {
  ...labelStyle,
  marginBottom: '10px',
}

const messageStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--text-muted)',
}

const buttonStyle: React.CSSProperties = {
  height: '36px',
  padding: '0 14px',
  border: '1px solid var(--amber)',
  borderRadius: '3px',
  background: 'rgba(245,158,11,0.08)',
  color: 'var(--amber)',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.1em',
  cursor: 'pointer',
}
