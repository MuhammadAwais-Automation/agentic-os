'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BRIDGE_URL } from '@/lib/constants'

interface Config {
  obsidianVaultPath: string
  projectsBasePath: string
  hourlyRate: string
  authToken: string
}

const STEPS = ['DETECT', 'VAULT', 'PROJECTS', 'TOKEN']

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [config, setConfig] = useState<Config>({
    obsidianVaultPath: '',
    projectsBasePath: 'C:\\Users\\You\\Projects',
    hourlyRate: '150',
    authToken: typeof window !== 'undefined' ? crypto.randomUUID().replace(/-/g, '') : '',
  })

  const update = (k: keyof Config, v: string) => setConfig(c => ({ ...c, [k]: v }))

  const finish = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${BRIDGE_URL}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          hourlyRate: parseFloat(config.hourlyRate) || 150,
          claudeAvailable: true,
          codexAvailable: false,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      localStorage.setItem('agenticToken', config.authToken)
      router.push('/home')
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'var(--text)',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    outline: 'none',
  }

  const btnStyle = (primary?: boolean): React.CSSProperties => ({
    padding: '10px 24px',
    border: `1px solid ${primary ? 'var(--amber)' : 'var(--border)'}`,
    borderRadius: '3px',
    background: primary ? 'rgba(245,158,11,0.1)' : 'transparent',
    color: primary ? 'var(--amber)' : 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    letterSpacing: '0.1em',
    cursor: 'pointer',
  })

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: '480px' }}>
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', margin: '0 auto 16px',
            border: '1px solid var(--amber)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--amber)', fontFamily: 'var(--font-display)', fontSize: '20px',
            boxShadow: '0 0 20px var(--amber-glow)',
          }}>A</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '0.15em' }}>
            AGENTIC OS SETUP
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', letterSpacing: '0.1em' }}>
            STEP {step + 1} / {STEPS.length} — {STEPS[step]}
          </div>
        </div>

        <div style={{ height: '2px', background: 'var(--border)', borderRadius: '1px', marginBottom: '32px' }}>
          <div style={{
            height: '100%', width: `${((step + 1) / STEPS.length) * 100}%`,
            background: 'var(--amber)', borderRadius: '1px',
            boxShadow: '0 0 8px var(--amber-glow)',
            transition: 'width 0.3s ease',
          }} />
        </div>

        <div style={{
          background: 'var(--bg-panel)', border: '1px solid var(--border)',
          borderRadius: '4px', padding: '28px',
          backdropFilter: 'blur(16px)',
        }}>
          {step === 0 && (
            <div>
              <SectionLabel>CLAUDE CODE DETECTED</SectionLabel>
              <InfoRow label="STATUS" value="Auto-detected" color="var(--teal)" />
              <InfoRow label="HISTORY PATH" value="%APPDATA%\\Claude" color="var(--text-muted)" />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px', lineHeight: 1.7 }}>
                Agentic OS reads your Claude Code session history to power the dashboard. No data leaves your machine.
              </p>
            </div>
          )}

          {step === 1 && (
            <div>
              <SectionLabel>OBSIDIAN VAULT PATH</SectionLabel>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.7 }}>
                Path to your Obsidian vault for memory file tracking. Leave blank to skip.
              </p>
              <input style={inputStyle} value={config.obsidianVaultPath}
                onChange={e => update('obsidianVaultPath', e.target.value)}
                placeholder="C:\Users\You\Documents\ObsidianVault" />
            </div>
          )}

          {step === 2 && (
            <div>
              <SectionLabel>PROJECTS BASE PATH</SectionLabel>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.7 }}>
                Root directory where your coding projects live.
              </p>
              <input style={inputStyle} value={config.projectsBasePath}
                onChange={e => update('projectsBasePath', e.target.value)}
                placeholder="C:\Users\You\Projects" />
              <div style={{ marginTop: '20px' }}>
                <SectionLabel>HOURLY RATE (USD)</SectionLabel>
                <input style={inputStyle} value={config.hourlyRate}
                  onChange={e => update('hourlyRate', e.target.value)}
                  placeholder="150" type="number" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <SectionLabel>AUTH TOKEN</SectionLabel>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.7 }}>
                Auto-generated secure token protecting the bridge API.
              </p>
              <input style={{ ...inputStyle, fontSize: '11px' }} value={config.authToken}
                onChange={e => update('authToken', e.target.value)} />
              {error && (
                <p style={{ marginTop: '12px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#ef4444' }}>
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <button style={btnStyle()} onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
            BACK
          </button>
          {step < STEPS.length - 1
            ? <button style={btnStyle(true)} onClick={() => setStep(s => s + 1)}>NEXT</button>
            : <button style={btnStyle(true)} onClick={finish} disabled={saving}>{saving ? 'SAVING...' : 'LAUNCH'}</button>
          }
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--amber)', letterSpacing: '0.15em', marginBottom: '12px' }}>
      {children}
    </div>
  )
}

function InfoRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color }}>{value}</span>
    </div>
  )
}
