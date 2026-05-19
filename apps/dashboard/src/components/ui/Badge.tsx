interface BadgeProps {
  label: string
  color?: 'amber' | 'teal' | 'purple' | 'red' | 'muted'
  style?: React.CSSProperties
}

const colorMap = {
  amber:  { bg: 'rgba(245,158,11,0.12)',  text: '#F59E0B', border: 'rgba(245,158,11,0.3)' },
  teal:   { bg: 'rgba(20,184,166,0.12)',  text: '#14B8A6', border: 'rgba(20,184,166,0.3)' },
  purple: { bg: 'rgba(139,92,246,0.12)', text: '#8B5CF6', border: 'rgba(139,92,246,0.3)' },
  red:    { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  muted:  { bg: 'rgba(255,255,255,0.05)', text: 'var(--text-muted)', border: 'var(--border)' },
}

export default function Badge({ label, color = 'muted', style }: BadgeProps) {
  const c = colorMap[color]
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '2px',
      color: c.text,
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      letterSpacing: '0.12em',
      ...style,
    }}>
      {label.toUpperCase()}
    </span>
  )
}
