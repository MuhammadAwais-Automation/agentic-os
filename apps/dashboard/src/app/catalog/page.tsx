'use client'

import { useEffect, useState } from 'react'
import GlowCard from '@/components/ui/GlowCard'
import Badge from '@/components/ui/Badge'
import PageFrame from '@/components/ui/PageFrame'
import PageHeader from '@/components/ui/PageHeader'
import CatalogToolbar from '@/components/catalog/CatalogToolbar'
import CatalogSummary from '@/components/catalog/CatalogSummary'
import CatalogItemList from '@/components/catalog/CatalogItemList'
import CatalogItemDetail from '@/components/catalog/CatalogItemDetail'
import PromptAttachmentPanel from '@/components/catalog/PromptAttachmentPanel'
import {
  attachCatalogItem,
  CatalogAttachment,
  CatalogFilters,
  CatalogItem,
  CatalogItemDetail as Detail,
  CatalogSummary as Summary,
  listCatalogItems,
  listPromptAttachments,
  loadCatalogItem,
  loadCatalogSummary,
  refreshCatalog,
  removeCatalogAttachment,
} from '@/lib/catalog'
import { listProjects, ProjectRecord } from '@/lib/projects'

export default function CatalogPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [projectId, setProjectId] = useState('')
  const [filters, setFilters] = useState<CatalogFilters>({})
  const [summary, setSummary] = useState<Summary | null>(null)
  const [items, setItems] = useState<CatalogItem[]>([])
  const [selected, setSelected] = useState<Detail | null>(null)
  const [attachments, setAttachments] = useState<CatalogAttachment[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [message, setMessage] = useState('')

  const activeProjectId = projectId || undefined

  const loadAll = async () => {
    const [nextSummary, nextItems, nextAttachments] = await Promise.all([
      loadCatalogSummary(activeProjectId),
      listCatalogItems({ ...filters, projectId: activeProjectId }),
      listPromptAttachments(activeProjectId),
    ])
    setSummary(nextSummary)
    setItems(nextItems)
    setAttachments(nextAttachments)
    if (selected && !nextItems.some((item) => item.id === selected.id)) setSelected(null)
  }

  useEffect(() => {
    listProjects().then(setProjects).catch(() => setProjects([]))
  }, [])

  useEffect(() => {
    void loadAll().catch((err) => setMessage(String(err)))
  }, [filters, projectId])

  const refresh = async () => {
    setRefreshing(true)
    setMessage('')
    try {
      const scanned = await refreshCatalog(activeProjectId)
      setMessage(`Scanned ${scanned} catalog item${scanned === 1 ? '' : 's'}.`)
      await loadAll()
    } catch (err) {
      setMessage(String(err))
    } finally {
      setRefreshing(false)
    }
  }

  const selectItem = async (item: CatalogItem) => {
    setMessage('')
    try {
      setSelected(await loadCatalogItem(item.id))
    } catch (err) {
      setMessage(String(err))
    }
  }

  const attach = async (id: string) => {
    setAttaching(true)
    try {
      await attachCatalogItem(id, activeProjectId)
      await loadAll()
    } catch (err) {
      setMessage(String(err))
    } finally {
      setAttaching(false)
    }
  }

  const remove = async (id: number) => {
    await removeCatalogAttachment(id)
    await loadAll()
  }

  return (
    <PageFrame className="fade-up">
      <PageHeader
        kicker="CAPABILITY LIBRARY"
        title="ECC CATALOG"
        subtitle="Skills, agents, commands, and rules available for prompt context."
        actions={
        <label style={{ width: '320px' }}>
          <div style={labelStyle}>PROJECT CONTEXT</div>
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">Global catalog</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
        }
      />

      <GlowCard color="amber" style={{ padding: '14px' }}>
        <CatalogToolbar filters={filters} onChange={setFilters} onRefresh={refresh} refreshing={refreshing} />
        {message && <div style={messageStyle}>{message}</div>}
      </GlowCard>

      <CatalogSummary summary={summary} />

      <div className="inspector-grid">
        <GlowCard color="teal" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
            <div style={labelStyle}>CATALOG ITEMS</div>
            <Badge label={`${items.length}`} color="muted" />
          </div>
          <CatalogItemList items={items} selectedId={selected?.id} onSelect={selectItem} />
        </GlowCard>

        <GlowCard color="purple" style={{ padding: '14px' }}>
          <CatalogItemDetail item={selected} onAttach={attach} attaching={attaching} />
        </GlowCard>

        <GlowCard color="amber" style={{ padding: '14px' }}>
          <PromptAttachmentPanel attachments={attachments} onRemove={remove} />
        </GlowCard>
      </div>
    </PageFrame>
  )
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  letterSpacing: '0.14em',
  marginBottom: '5px',
}

const messageStyle: React.CSSProperties = {
  marginTop: '10px',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--text-muted)',
}
