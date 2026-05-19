import { CSSProperties, ReactNode } from 'react'

interface GlowCardProps {
  children: ReactNode
  color?: 'amber' | 'teal' | 'purple' | 'muted'
  style?: CSSProperties
  className?: string
}

const glowMap = {
  amber:  { border: 'rgba(245,158,11,0.18)',  shadow: '0 0 24px rgba(245,158,11,0.06)', top: 'rgba(245,158,11,0.26)' },
  teal:   { border: 'rgba(20,184,166,0.18)',   shadow: '0 0 24px rgba(20,184,166,0.06)',  top: 'rgba(20,184,166,0.26)' },
  purple: { border: 'rgba(139,92,246,0.18)',   shadow: '0 0 24px rgba(139,92,246,0.06)',  top: 'rgba(139,92,246,0.26)' },
  muted:  { border: 'var(--border)',            shadow: '0 8px 32px rgba(0,0,0,0.18)',     top: 'rgba(226,232,240,0.1)' },
}

export default function GlowCard({ children, color = 'amber', style, className }: GlowCardProps) {
  const g = glowMap[color]
  return (
    <div
      className={className}
      style={{
        background: 'linear-gradient(180deg, rgba(18,23,34,0.94), rgba(13,17,23,0.88))',
        border: `1px solid ${g.border}`,
        borderTop: `1px solid ${g.top}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: g.shadow,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transition: 'box-shadow 0.2s ease',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
