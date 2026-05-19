import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'default' | 'primary' | 'danger'
}

export default function ActionButton({ children, variant = 'default', ...props }: ActionButtonProps) {
  return (
    <button className="action-button" data-variant={variant} {...props}>
      {children}
    </button>
  )
}
