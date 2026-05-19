type StatusTone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'discovery'

interface StatusPillProps {
  label: string
  tone?: StatusTone
}

const toneMap: Record<StatusTone, { color: string; bg: string; border: string }> = {
  neutral: { color: 'var(--text-muted)', bg: 'rgba(216,222,233,0.05)', border: 'var(--border)' },
  brand: { color: 'var(--brand)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.28)' },
  info: { color: 'var(--info)', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.28)' },
  success: { color: 'var(--success)', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.28)' },
  warning: { color: 'var(--warning)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.28)' },
  danger: { color: 'var(--danger)', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.28)' },
  discovery: { color: 'var(--discovery)', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.28)' },
}

export default function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  const token = toneMap[tone]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      minHeight: '24px',
      padding: '2px 9px',
      border: `1px solid ${token.border}`,
      borderRadius: '999px',
      background: token.bg,
      color: token.color,
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      letterSpacing: '0.08em',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: token.color }} />
      {label.toUpperCase()}
    </span>
  )
}
