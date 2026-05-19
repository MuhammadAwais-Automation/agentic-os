'use client'

import { useEffect, useState } from 'react'
import { addProject, listProjects, openProject, refreshProject, ProjectRecord } from '@/lib/projects'

interface ProjectSelectorProps {
  activeProject: ProjectRecord | null
  onProjectChange: (project: ProjectRecord) => void
}

export default function ProjectSelector({ activeProject, onProjectChange }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [pathInput, setPathInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reload = async () => {
    try {
      const rows = await listProjects()
      setProjects(rows)
      if (!activeProject && rows.length) onProjectChange(rows[0])
    } catch (err) {
      setError(String(err))
    }
  }

  useEffect(() => { void reload() }, [])

  const add = async () => {
    if (!pathInput.trim()) return
    setBusy(true)
    setError('')
    try {
      const project = await addProject(pathInput.trim())
      setPathInput('')
      onProjectChange(project)
      await reload()
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  const select = async (id: string) => {
    const project = projects.find((item) => item.id === id)
    if (!project) return
    onProjectChange(project)
    try {
      const opened = await openProject(id)
      onProjectChange(opened)
      await reload()
    } catch {
      // Selection still works with cached metadata if open marker update fails.
    }
  }

  const refresh = async () => {
    if (!activeProject) return
    setBusy(true)
    setError('')
    try {
      const project = await refreshProject(activeProject.id)
      onProjectChange(project)
      await reload()
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 260px) minmax(0, 1fr) auto auto', gap: '10px', alignItems: 'end' }}>
        <label>
          <div style={labelStyle}>RECENT PROJECT</div>
          <select value={activeProject?.id || ''} onChange={(event) => void select(event.target.value)} style={{ width: '100%' }}>
            <option value="">Select project...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
        <label>
          <div style={labelStyle}>ADD PROJECT PATH</div>
          <input
            value={pathInput}
            onChange={(event) => setPathInput(event.target.value)}
            placeholder="E:\Dashboard OS\agentic-os"
            onKeyDown={(event) => event.key === 'Enter' && void add()}
            style={{ width: '100%' }}
          />
        </label>
        <button onClick={add} disabled={busy || !pathInput.trim()} style={buttonStyle('amber')}>ADD</button>
        <button onClick={refresh} disabled={busy || !activeProject} style={buttonStyle('teal')}>REFRESH</button>
      </div>
      {activeProject && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          ACTIVE: {activeProject.path}
        </div>
      )}
      {error && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#ef4444' }}>
          {error}
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  letterSpacing: '0.14em',
  marginBottom: '4px',
}

function buttonStyle(color: 'amber' | 'teal'): React.CSSProperties {
  const cssVar = color === 'amber' ? 'var(--amber)' : 'var(--teal)'
  const dim = color === 'amber' ? 'rgba(245,158,11,0.1)' : 'rgba(20,184,166,0.1)'
  return {
    padding: '8px 16px',
    border: `1px solid ${cssVar}`,
    borderRadius: '3px',
    background: dim,
    color: cssVar,
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    letterSpacing: '0.1em',
    cursor: 'pointer',
  }
}
