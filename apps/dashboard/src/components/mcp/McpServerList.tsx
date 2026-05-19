import Badge from '@/components/ui/Badge'
import { McpServer } from '@/lib/mcp'

interface McpServerListProps {
  servers: McpServer[]
  selectedId?: string
  onSelect: (server: McpServer) => void
}

export default function McpServerList({ servers, selectedId, onSelect }: McpServerListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflow: 'auto' }}>
      {servers.map((server) => (
        <button
          key={server.id}
          onClick={() => onSelect(server)}
          style={{
            textAlign: 'left',
            border: `1px solid ${selectedId === server.id ? 'rgba(20,184,166,0.55)' : 'var(--border)'}`,
            borderRadius: '3px',
            background: selectedId === server.id ? 'rgba(20,184,166,0.08)' : 'rgba(0,0,0,0.22)',
            padding: '10px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
            <span style={titleStyle}>{server.name}</span>
            <Badge label={server.status.replace('_', ' ')} color={statusColor(server.status)} />
          </div>
          <div style={metaStyle}>{server.scope} / {server.source}</div>
          {server.missingEnvKeys.length > 0 && (
            <div style={{ ...metaStyle, color: '#ef4444' }}>
              Missing: {server.missingEnvKeys.join(', ')}
            </div>
          )}
        </button>
      ))}
      {!servers.length && <div style={metaStyle}>No MCP servers found. Refresh after adding Codex or MCP config.</div>}
    </div>
  )
}

function statusColor(status: string): 'amber' | 'teal' | 'purple' | 'red' | 'muted' {
  if (status === 'healthy') return 'teal'
  if (status === 'missing_env' || status === 'invalid_config' || status === 'unhealthy') return 'red'
  if (status === 'configured') return 'amber'
  return 'muted'
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
