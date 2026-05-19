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

interface MemoryFile {
  filename: string
  staleness: 'fresh' | 'warning' | 'stale'
  lastModified: number | string
  healthScore?: number
  ageDays?: number
}

const toneByStaleness: Record<MemoryFile['staleness'], 'success' | 'warning' | 'danger'> = {
  fresh: 'success',
  warning: 'warning',
  stale: 'danger',
}

export default function MemoryPage() {
  const [files, setFiles] = useState<MemoryFile[]>([])
  const [healthScore, setHealthScore] = useState(100)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'fresh' | 'warning' | 'stale'>('all')
  const [refreshing, setRefreshing] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${BRIDGE_URL}/api/memory`, { headers: authHeaders() })
      const data = await response.json()
      setFiles((Array.isArray(data) ? data : (data?.files ?? [])) as MemoryFile[])
      setHealthScore(Number(data?.healthScore ?? 100))
    } catch {
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleRefresh = async (filename: string) => {
    setRefreshing(filename)
    await fetch(`${BRIDGE_URL}/api/memory/${encodeURIComponent(filename)}/refresh`, {
      method: 'PATCH',
      headers: authHeaders(),
    }).catch(() => {})
    await load()
    setRefreshing(null)
  }

  const filtered = useMemo(() => filter === 'all' ? files : files.filter((file) => file.staleness === filter), [files, filter])
  const staleCount = files.filter((file) => file.staleness === 'stale').length
  const warningCount = files.filter((file) => file.staleness === 'warning').length

  return (
    <PageFrame className="fade-up">
      <PageHeader
        kicker="KNOWLEDGE HEALTH"
        title="MEMORY"
        subtitle={`${files.length} files tracked, ${staleCount + warningCount} need review`}
        actions={<ActionButton variant="primary" onClick={() => void load()} disabled={loading}>{loading ? 'LOADING' : 'REFRESH'}</ActionButton>}
      />

      <div className="auto-grid">
        <GlowCard color="teal" style={{ padding: '16px' }}>
          <div className="section-label">HEALTH SCORE</div>
          <div style={{ marginTop: '10px', fontFamily: 'var(--font-display)', fontSize: '40px', color: 'var(--teal)' }}>{healthScore}%</div>
        </GlowCard>
        <GlowCard color={staleCount ? 'amber' : 'muted'} style={{ padding: '16px' }}>
          <div className="section-label">STALE FILES</div>
          <div style={{ marginTop: '10px', fontFamily: 'var(--font-display)', fontSize: '40px', color: staleCount ? 'var(--danger)' : 'var(--text)' }}>{staleCount}</div>
        </GlowCard>
        <GlowCard color="purple" style={{ padding: '16px' }}>
          <div className="section-label">WARNINGS</div>
          <div style={{ marginTop: '10px', fontFamily: 'var(--font-display)', fontSize: '40px', color: 'var(--warning)' }}>{warningCount}</div>
        </GlowCard>
      </div>

      <GlowCard color="amber" style={{ padding: '14px' }}>
        <div className="segmented-control">
          {(['all', 'fresh', 'warning', 'stale'] as const).map((item) => (
            <button key={item} data-active={filter === item} onClick={() => setFilter(item)}>{item.toUpperCase()}</button>
          ))}
        </div>
      </GlowCard>

      <GlowCard color="teal" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '16px' }}>{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} height="32px" style={{ marginBottom: '10px' }} />)}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '18px' }}><EmptyState title="No memory files in this view" detail="Change filters or configure Claude memory paths in setup." /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Last Modified</th>
                <th>Age</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((file) => (
                <tr key={file.filename}>
                  <td data-label="File">{file.filename}</td>
                  <td data-label="Last Modified">{file.lastModified ? new Date(file.lastModified).toLocaleDateString() : '-'}</td>
                  <td data-label="Age">{file.ageDays ?? '-'} days</td>
                  <td data-label="Status"><StatusPill label={file.staleness} tone={toneByStaleness[file.staleness]} /></td>
                  <td data-label="Action">
                    <ActionButton onClick={() => void handleRefresh(file.filename)} disabled={refreshing === file.filename}>
                      {refreshing === file.filename ? 'MARKING' : 'MARK FRESH'}
                    </ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlowCard>
    </PageFrame>
  )
}
