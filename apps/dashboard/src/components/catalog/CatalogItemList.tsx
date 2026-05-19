import Badge from '@/components/ui/Badge'
import { CatalogItem } from '@/lib/catalog'

interface CatalogItemListProps {
  items: CatalogItem[]
  selectedId?: string
  onSelect: (item: CatalogItem) => void
}

export default function CatalogItemList({ items, selectedId, onSelect }: CatalogItemListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '620px', overflow: 'auto' }}>
      {items.map((item) => (
        <button key={item.id} onClick={() => onSelect(item)} style={itemStyle(item.id === selectedId)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={nameStyle}>{item.name}</div>
              <div style={descStyle}>{item.description || item.path}</div>
            </div>
            <Badge label={item.kind} color={kindColor(item.kind)} />
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
            <Badge label={item.category || 'uncat'} color="muted" />
            <Badge label={item.target} color="teal" />
            <Badge label={item.source} color="purple" />
          </div>
        </button>
      ))}
      {!items.length && <div style={emptyStyle}>No catalog items found. Refresh the catalog or clear filters.</div>}
    </div>
  )
}

function kindColor(kind: string): 'amber' | 'teal' | 'purple' | 'red' | 'muted' {
  if (kind === 'skill') return 'teal'
  if (kind === 'agent') return 'purple'
  if (kind === 'command') return 'amber'
  return 'muted'
}

function itemStyle(active: boolean): React.CSSProperties {
  return {
    border: `1px solid ${active ? 'rgba(245,158,11,0.55)' : 'var(--border)'}`,
    borderRadius: '3px',
    background: active ? 'rgba(245,158,11,0.08)' : 'rgba(0,0,0,0.24)',
    padding: '10px',
    textAlign: 'left',
  }
}

const nameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--text)',
  overflowWrap: 'anywhere',
}

const descStyle: React.CSSProperties = {
  marginTop: '4px',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  overflowWrap: 'anywhere',
}

const emptyStyle: React.CSSProperties = {
  padding: '20px',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
}
