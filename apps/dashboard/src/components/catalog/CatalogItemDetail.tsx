import Badge from '@/components/ui/Badge'
import { CatalogItemDetail as Detail } from '@/lib/catalog'

interface CatalogItemDetailProps {
  item: Detail | null
  onAttach: (id: string) => void
  attaching: boolean
}

export default function CatalogItemDetail({ item, onAttach, attaching }: CatalogItemDetailProps) {
  if (!item) return <div style={emptyStyle}>Select a catalog item to inspect metadata and preview.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'start' }}>
        <div>
          <div style={labelStyle}>DETAIL</div>
          <h2 style={titleStyle}>{item.name}</h2>
        </div>
        <button onClick={() => onAttach(item.id)} disabled={attaching} style={attachStyle}>{attaching ? 'ATTACHING' : 'ATTACH'}</button>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <Badge label={item.kind} color="teal" />
        <Badge label={item.category || 'uncat'} color="muted" />
        <Badge label={item.target} color="amber" />
        <Badge label={item.source} color="purple" />
      </div>
      <div style={descStyle}>{item.description || 'No description found.'}</div>
      <div>
        <div style={labelStyle}>PATH</div>
        <div style={pathStyle}>{item.path}</div>
      </div>
      {!!item.tags.length && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {item.tags.map((tag) => <Badge key={tag} label={tag} color="muted" />)}
        </div>
      )}
      <div>
        <div style={labelStyle}>PREVIEW</div>
        <pre style={previewStyle}>{item.preview || 'No preview available.'}</pre>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  letterSpacing: '0.14em',
}

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '28px',
  letterSpacing: '0.08em',
  color: 'var(--amber)',
  marginTop: '4px',
}

const descStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--text)',
  lineHeight: 1.6,
}

const pathStyle: React.CSSProperties = {
  marginTop: '5px',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  overflowWrap: 'anywhere',
}

const previewStyle: React.CSSProperties = {
  marginTop: '6px',
  maxHeight: '330px',
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  padding: '12px',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  background: 'rgba(0,0,0,0.42)',
  color: 'var(--text)',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
}

const emptyStyle: React.CSSProperties = {
  minHeight: '220px',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
}

const attachStyle: React.CSSProperties = {
  padding: '7px 12px',
  border: '1px solid var(--teal)',
  borderRadius: '3px',
  color: 'var(--teal)',
  background: 'rgba(20,184,166,0.08)',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.1em',
}
