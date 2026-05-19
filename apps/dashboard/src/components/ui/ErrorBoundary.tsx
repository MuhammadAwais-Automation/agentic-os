'use client'
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '32px',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '4px',
          background: 'rgba(239,68,68,0.05)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: '#ef4444',
        }}>
          <div style={{ marginBottom: '8px', letterSpacing: '0.15em' }}>// ERROR</div>
          <div style={{ color: 'var(--text-muted)' }}>{this.state.message || 'An unexpected error occurred.'}</div>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            style={{
              marginTop: '16px', padding: '6px 14px',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: '3px', color: '#ef4444',
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              letterSpacing: '0.1em', cursor: 'pointer',
            }}
          >
            RETRY
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
