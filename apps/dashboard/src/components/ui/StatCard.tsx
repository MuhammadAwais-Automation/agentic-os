import { ReactNode } from 'react'
import GlowCard from './GlowCard'

interface StatCardProps {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: 'amber' | 'teal' | 'purple' | 'muted'
}

const accentColor: Record<string, string> = {
  amber:  'var(--amber)',
  teal:   'var(--teal)',
  purple: 'var(--purple)',
  muted:  'rgba(226,232,240,0.2)',
}

export default function StatCard({ label, value, detail, tone = 'muted' }: StatCardProps) {
  return (
    <GlowCard color={tone} style={{ padding: '16px 18px', minHeight: '110px', position: 'relative', overflow: 'hidden' }}>
      {/* left accent bar */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: '16px',
        bottom: '16px',
        width: '2px',
        borderRadius: '0 2px 2px 0',
        background: accentColor[tone],
        opacity: 0.7,
      }} />
      <div className="section-label" style={{ paddingLeft: '2px' }}>{label}</div>
      <div style={{
        marginTop: '10px',
        fontFamily: 'var(--font-display)',
        fontSize: '38px',
        lineHeight: 1,
        color: tone === 'muted' ? 'var(--text-strong)' : accentColor[tone],
        letterSpacing: '0.04em',
      }}>
        {value}
      </div>
      {detail && (
        <div style={{
          marginTop: '8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          letterSpacing: '0.06em',
        }}>
          {detail}
        </div>
      )}
    </GlowCard>
  )
}
