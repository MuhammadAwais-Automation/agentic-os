import Badge from '@/components/ui/Badge'
import GlowCard from '@/components/ui/GlowCard'
import { McpSummary as Summary } from '@/lib/mcp'

interface McpSummaryProps {
  summary: Summary | null
}

export default function McpSummary({ summary }: McpSummaryProps) {
  const cards = [
    { label: 'SERVERS', value: summary?.total ?? 0, color: 'amber' as const },
    { label: 'HEALTHY', value: summary?.byStatus.healthy ?? 0, color: 'teal' as const },
    { label: 'MISSING ENV', value: summary?.missingEnv ?? 0, color: (summary?.missingEnv ?? 0) ? 'red' as const : 'muted' as const },
    { label: 'DRIFT', value: (summary?.byDrift.changed ?? 0) + (summary?.byDrift.missing ?? 0), color: 'purple' as const },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
      {cards.map((card) => (
        <GlowCard key={card.label} color={card.color === 'red' ? 'muted' : card.color} style={{ padding: '14px' }}>
          <div style={labelStyle}>{card.label}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <span style={valueStyle}>{card.value}</span>
            <Badge label={card.color === 'red' ? 'warn' : card.color} color={card.color} />
          </div>
        </GlowCard>
      ))}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  letterSpacing: '0.14em',
}

const valueStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '28px',
  color: 'var(--text)',
}
