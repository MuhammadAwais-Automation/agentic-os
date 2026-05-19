import { CSSProperties, ReactNode } from 'react'

interface GlassPanelProps {
  children: ReactNode
  style?: CSSProperties
  className?: string
}

export default function GlassPanel({ children, style, className }: GlassPanelProps) {
  return (
    <div
      className={`glass ${className || ''}`}
      style={{ borderRadius: '4px', padding: '20px', ...style }}
    >
      {children}
    </div>
  )
}
