'use client'

import Badge from '@/components/ui/Badge'
import { ProjectRecord } from '@/lib/projects'

interface ProjectSummaryProps {
  project: ProjectRecord | null
  graphNodes: number
  graphEdges: number
}

export default function ProjectSummary({ project, graphNodes, graphEdges }: ProjectSummaryProps) {
  if (!project) {
    return <EmptyPanel text="Add or select a project to see workspace metadata." />
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
      <Meta label="FRAMEWORK" value={project.framework || 'unknown'} />
      <Meta label="PACKAGE" value={project.packageManager || 'unknown'} />
      <Meta label="GIT" value={project.gitBranch ? `${project.gitBranch}${project.gitDirty ? ' *' : ''}` : 'no git'} />
      <div style={metaBox}>
        <div style={labelStyle}>GRAPHIFY</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge label={project.graphifyStatus.toUpperCase()} color={project.graphifyStatus === 'ready' ? 'teal' : project.graphifyStatus === 'stale' ? 'amber' : 'red'} />
          <span style={valueStyle}>{graphNodes} / {graphEdges}</span>
        </div>
      </div>
    </div>
  )
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div style={{ ...metaBox, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
      {text}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={metaBox}>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{value}</div>
    </div>
  )
}

const metaBox: React.CSSProperties = {
  minHeight: '64px',
  padding: '10px',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  background: 'rgba(0,0,0,0.22)',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  color: 'var(--text-muted)',
  letterSpacing: '0.14em',
  marginBottom: '6px',
}

const valueStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--text)',
  overflowWrap: 'anywhere',
}
