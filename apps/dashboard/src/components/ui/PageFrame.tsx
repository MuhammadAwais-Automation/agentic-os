import { ReactNode } from 'react'

interface PageFrameProps {
  children: ReactNode
  className?: string
}

export default function PageFrame({ children, className }: PageFrameProps) {
  return <div className={className ? `page-frame ${className}` : 'page-frame'}>{children}</div>
}
