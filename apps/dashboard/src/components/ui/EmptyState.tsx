import { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  detail?: string
  action?: ReactNode
}

export default function EmptyState({ title, detail, action }: EmptyStateProps) {
  return (
    <div style={{
      minHeight: '140px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      border: '1px dashed var(--border-strong)',
      borderRadius: 'var(--radius-md)',
      background: 'rgba(216,222,233,0.025)',
      padding: '22px',
      textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text)' }}>{title}</div>
      {detail && <p style={{ maxWidth: '520px', fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{detail}</p>}
      {action}
    </div>
  )
}
