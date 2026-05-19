import Badge from '@/components/ui/Badge'
import { CatalogAttachment } from '@/lib/catalog'

interface PromptAttachmentPanelProps {
  attachments: CatalogAttachment[]
  onRemove: (id: number) => void
}

export default function PromptAttachmentPanel({ attachments, onRemove }: PromptAttachmentPanelProps) {
  const snippet = attachments.map((attachment) => `- ${attachment.item.kind}: ${attachment.item.name}`).join('\n')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={labelStyle}>PROMPT ATTACHMENTS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {attachments.map((attachment) => (
          <div key={attachment.id} style={rowStyle}>
            <div style={{ minWidth: 0 }}>
              <div style={nameStyle}>{attachment.item.name}</div>
              <Badge label={attachment.item.kind} color={attachment.item.kind === 'agent' ? 'purple' : 'teal'} />
            </div>
            <button onClick={() => onRemove(attachment.id)} style={removeStyle}>REMOVE</button>
          </div>
        ))}
        {!attachments.length && <div style={mutedStyle}>No skills or agents attached to this prompt context.</div>}
      </div>
      <pre style={snippetStyle}>{snippet || 'Attach catalog items to generate prompt context.'}</pre>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  letterSpacing: '0.14em',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '10px',
  padding: '8px',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  background: 'rgba(0,0,0,0.24)',
}

const nameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--text)',
  overflowWrap: 'anywhere',
  marginBottom: '5px',
}

const mutedStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
}

const removeStyle: React.CSSProperties = {
  color: '#ef4444',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.1em',
}

const snippetStyle: React.CSSProperties = {
  whiteSpace: 'pre-wrap',
  minHeight: '74px',
  padding: '10px',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  background: 'rgba(0,0,0,0.42)',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
}
