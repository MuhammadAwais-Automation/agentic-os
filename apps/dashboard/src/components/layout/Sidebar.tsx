'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Terminal,
  CheckSquare,
  Activity,
  Brain,
  Sparkles,
  Plug,
  BookOpen,
  Settings,
} from 'lucide-react'

const NAV = [
  { href: '/home',      label: 'Home',     icon: Home },
  { href: '/coding',    label: 'Command',  icon: Terminal },
  { href: '/approvals', label: 'Approvals',icon: CheckSquare },
  { href: '/sessions',  label: 'Runs',     icon: Activity },
  { href: '/memory',    label: 'Memory',   icon: Brain },
  { href: '/dream',     label: 'Dream',    icon: Sparkles },
  { href: '/mcp',       label: 'MCP',      icon: Plug },
  { href: '/catalog',   label: 'Catalog',  icon: BookOpen },
  { href: '/settings',  label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <nav
      className="app-sidebar"
      style={{
        width: 'var(--sidebar-w)',
        height: '100vh',
        background: 'rgba(7,8,13,0.96)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '14px',
        paddingBottom: '14px',
        flexShrink: 0,
        zIndex: 100,
        boxShadow: '1px 0 0 rgba(245,158,11,0.04), 12px 0 38px rgba(0,0,0,0.22)',
        overflow: 'hidden',
      }}
    >
      {/* logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '0 16px',
        marginBottom: '20px',
      }}>
        <div style={{
          width: '30px',
          height: '30px',
          border: '1px solid rgba(245,158,11,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--amber)',
          fontFamily: 'var(--font-display)',
          fontSize: '14px',
          boxShadow: '0 0 14px rgba(245,158,11,0.16)',
          borderRadius: '6px',
          background: 'rgba(245,158,11,0.07)',
          flexShrink: 0,
        }}>A</div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '13px',
          letterSpacing: '0.16em',
          color: 'var(--text-strong)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}>
          AGENTIC OS
        </span>
      </div>

      {/* nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 16px',
                  position: 'relative',
                  color: active ? 'var(--amber)' : 'var(--text-faint)',
                  transition: 'color 0.18s, background 0.18s',
                  background: active ? 'rgba(245,158,11,0.06)' : 'transparent',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.color = 'var(--text)'
                    el.style.background = 'rgba(255,255,255,0.03)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.color = 'var(--text-faint)'
                    el.style.background = 'transparent'
                  }
                }}
              >
                {active && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '2px',
                    height: '22px',
                    background: 'var(--amber)',
                    boxShadow: '0 0 8px var(--amber-glow)',
                    borderRadius: '0 2px 2px 0',
                  }} />
                )}
                <Icon size={15} strokeWidth={1.6} style={{ flexShrink: 0 }} />
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}>
                  {label}
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      <div style={{ padding: '0 16px', marginTop: '8px' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--text-faint)',
          letterSpacing: '0.12em',
          borderTop: '1px solid var(--border)',
          paddingTop: '10px',
        }}>
          v1.0 // LOCAL
        </div>
      </div>
    </nav>
  )
}
