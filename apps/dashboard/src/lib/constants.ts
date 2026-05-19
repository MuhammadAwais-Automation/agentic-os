export const BRIDGE_URL = 'http://localhost:3001'
export const BRIDGE_WS = 'ws://localhost:3001'

export const COLORS = {
  bg: '#0A0A0F',
  bgPanel: 'rgba(15, 15, 22, 0.85)',
  amber: '#F59E0B',
  amberDim: 'rgba(245, 158, 11, 0.15)',
  teal: '#14B8A6',
  tealDim: 'rgba(20, 184, 166, 0.15)',
  purple: '#8B5CF6',
  purpleDim: 'rgba(139, 92, 246, 0.15)',
  border: 'rgba(255,255,255,0.06)',
  text: '#E8E8F0',
  textMuted: 'rgba(232,232,240,0.45)',
}

export const getToken = (): string => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('agenticToken') || ''
}

export const authHeaders = (): HeadersInit => ({
  'Authorization': `Bearer ${getToken()}`,
  'Content-Type': 'application/json',
})
