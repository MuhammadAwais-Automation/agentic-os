import Badge from '@/components/ui/Badge'
import { McpServer } from '@/lib/mcp'

interface McpEnvWarningsProps {
  servers: McpServer[]
}

export default function McpEnvWarnings({ servers }: McpEnvWarningsProps) {
  const warnings = servers.filter((server) => server.missingEnvKeys.length > 0 || server.status === 'invalid_config' || server.status === 'unhealthy')

  return (
    <div>
      <div style={headerStyle}>WARNINGS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {warnings.map((server) => (
          <div key={server.id} style={itemStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
              <span style={titleStyle}>{server.name}</span>
              <Badge label={server.status.replace('_', ' ')} color="red" />
            </div>
            <div style={metaStyle}>{server.source} / {server.scope}</div>
            {server.missingEnvKeys.length > 0 && (
              <div style={warningStyle}>Missing env names: {server.missingEnvKeys.join(', ')}</div>
            )}
            {server.healthMessage && <div style={warningStyle}>{server.healthMessage}</div>}
          </div>
        ))}
        {!warnings.length && <div style={metaStyle}>No MCP warnings. Env values stay hidden by design.</div>}
      </div>
    </div>
  )
}

const headerStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  letterSpacing: '0.14em',
  marginBottom: '10px',
}

const itemStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '3px',
  background: 'rgba(0,0,0,0.22)',
  padding: '10px',
}

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--text)',
}

const metaStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  marginTop: '6px',
}

const warningStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: '#ef4444',
  marginTop: '8px',
  overflowWrap: 'anywhere',
}
