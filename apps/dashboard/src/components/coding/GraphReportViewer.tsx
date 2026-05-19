'use client'

import { useState } from 'react'

interface GraphReportViewerProps {
  report: string
  html: string
  manifest: unknown
}

type Tab = 'report' | 'html' | 'manifest'

export default function GraphReportViewer({ report, html, manifest }: GraphReportViewerProps) {
  const [tab, setTab] = useState<Tab>('report')
  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        {(['report', 'html', 'manifest'] as Tab[]).map((item) => (
          <button key={item} onClick={() => setTab(item)} style={tabButton(tab === item)}>{item.toUpperCase()}</button>
        ))}
      </div>
      {tab === 'report' && <pre style={panelStyle}>{report || 'No GRAPH_REPORT.md loaded.'}</pre>}
      {tab === 'manifest' && <pre style={panelStyle}>{manifest ? JSON.stringify(manifest, null, 2) : 'No manifest loaded.'}</pre>}
      {tab === 'html' && (
        html ? (
          <iframe
            title="Graphify HTML Preview"
            sandbox=""
            srcDoc={html}
            style={{ width: '100%', height: '420px', border: '1px solid var(--border)', borderRadius: '3px', background: '#fff' }}
          />
        ) : <pre style={panelStyle}>No graph.html loaded.</pre>
      )}
    </div>
  )
}

function tabButton(active: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    border: `1px solid ${active ? 'rgba(139,92,246,0.55)' : 'var(--border)'}`,
    borderRadius: '3px',
    background: active ? 'rgba(139,92,246,0.12)' : 'transparent',
    color: active ? 'var(--purple)' : 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.1em',
    cursor: 'pointer',
  }
}

const panelStyle: React.CSSProperties = {
  maxHeight: '420px',
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  padding: '14px',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  background: 'rgba(0,0,0,0.45)',
  color: 'var(--text)',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  lineHeight: 1.6,
}
