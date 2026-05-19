import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  kicker?: string
  subtitle?: string
  actions?: ReactNode
}

export default function PageHeader({ title, kicker, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        {kicker && <div className="page-kicker">{kicker}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}
