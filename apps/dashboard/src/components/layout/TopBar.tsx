'use client'
import { useEffect, useState } from 'react'
import { BRIDGE_URL } from '@/lib/constants'

export default function TopBar() {
  const [time, setTime] = useState('')
  const [connected, setConnected] = useState<boolean | null>(null)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${BRIDGE_URL}/api/config/status`)
        setConnected(res.ok)
      } catch {
        setConnected(false)
      }
    }
    check()
    const id = setInterval(check, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="app-topbar" style={{
      height: 'var(--topbar-h)',
      background: 'rgba(7,8,13,0.78)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 22px',
      flexShrink: 0,
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      boxShadow: '0 12px 38px rgba(0,0,0,0.12)',
    }}>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: '14px',
        color: 'var(--text)',
        letterSpacing: '0.18em',
      }}>
        AGENTIC OS <span style={{ color: 'var(--amber)', margin: '0 6px' }}>//</span> MISSION CONTROL
      </span>

      <div className="topbar-status" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px',
          color: 'var(--text-muted)', letterSpacing: '0.1em',
          border: '1px solid var(--border)',
          borderRadius: '999px',
          padding: '4px 9px',
          background: 'rgba(216,222,233,0.035)',
        }}>
          CTRL+K
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: connected === null ? 'var(--text-muted)' : connected ? 'var(--success)' : 'var(--danger)',
            boxShadow: connected ? '0 0 8px var(--teal-glow)' : 'none',
            transition: 'background 0.3s, box-shadow 0.3s',
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px',
            color: 'var(--text-muted)', letterSpacing: '0.1em',
          }}>
            {connected === null ? 'CONNECTING' : connected ? 'BRIDGE ONLINE' : 'BRIDGE OFFLINE'}
          </span>
        </div>

        <span className="topbar-clock" style={{
          fontFamily: 'var(--font-mono)', fontSize: '12px',
          color: 'var(--amber)', letterSpacing: '0.08em',
        }}>{time}</span>
      </div>
    </header>
  )
}
