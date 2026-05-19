import { CatalogFilters } from '@/lib/catalog'

interface CatalogToolbarProps {
  filters: CatalogFilters
  onChange: (filters: CatalogFilters) => void
  onRefresh: () => void
  refreshing: boolean
}

export default function CatalogToolbar({ filters, onChange, onRefresh, refreshing }: CatalogToolbarProps) {
  const update = (key: keyof CatalogFilters, value: string) => {
    onChange({ ...filters, [key]: value || undefined })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) repeat(4, minmax(120px, 160px)) auto', gap: '10px', alignItems: 'end' }}>
      <label>
        <div style={labelStyle}>SEARCH</div>
        <input value={filters.q || ''} onChange={(event) => update('q', event.target.value)} placeholder="graphify, security, review..." />
      </label>
      <Select label="KIND" value={filters.kind || ''} onChange={(value) => update('kind', value)} options={['', 'skill', 'agent', 'command', 'rule']} />
      <Select label="CATEGORY" value={filters.category || ''} onChange={(value) => update('category', value)} options={['', 'testing', 'security', 'frontend', 'backend', 'research', 'agent-os', 'workflow', 'utility']} />
      <Select label="TARGET" value={filters.target || ''} onChange={(value) => update('target', value)} options={['', 'codex', 'claude', 'both', 'generic']} />
      <Select label="SOURCE" value={filters.source || ''} onChange={(value) => update('source', value)} options={['', 'ecc', 'user-agents', 'user-claude', 'user-codex', 'project-agents', 'project-claude', 'project-codex']} />
      <button onClick={onRefresh} disabled={refreshing} style={buttonStyle}>{refreshing ? 'SCANNING' : 'REFRESH'}</button>
    </div>
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
}
