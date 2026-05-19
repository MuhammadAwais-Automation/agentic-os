import Badge from '@/components/ui/Badge'
import { CatalogSummary as Summary } from '@/lib/catalog'

interface CatalogSummaryProps {
  summary: Summary | null
}

export default function CatalogSummary({ summary }: CatalogSummaryProps) {
  const stats = [
    ['TOTAL', summary?.total ?? 0, 'amber'],
    ['SKILLS', summary?.byKind.skill ?? 0, 'teal'],
    ['AGENTS', summary?.byKind.agent ?? 0, 'purple'],
    ['CODEX', summary?.codexReady ?? 0, 'teal'],
    ['CLAUDE', summary?.claudeReady ?? 0, 'amber'],
    ['PROJECT', summary?.projectLocal ?? 0, 'purple'],
  ] as const

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '10px' }}>
      {stats.map(([label, value, color]) => (
        <div key={label} style={boxStyle}>
          <Badge label={label} color={color} />
          <div style={valueStyle}>{value}</div>
        </div>
      ))}
    </div>
  )
}

const boxStyle: React.CSSProperties = {
  padding: '10px',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  background: 'rgba(0,0,0,0.22)',
  minHeight: '72px',
}

const valueStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '28px',
  color: 'var(--text)',
  marginTop: '8px',
  lineHeight: 1,
}
