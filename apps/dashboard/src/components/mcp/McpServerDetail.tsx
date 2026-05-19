import Badge from '@/components/ui/Badge'
import { McpServer } from '@/lib/mcp'

interface McpServerDetailProps {
  server: McpServer | null
  checking: boolean
  onCheck: (serverId: string) => void
}

export default function McpServerDetail({ server, checking, onCheck }: McpServerDetailProps) {
  if (!server) return <div style={emptyStyle}>Select an MCP server to inspect config and health.</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={labelStyle}>MCP SERVER</div>
          <h2 style={titleStyle}>{server.name}</h2>
        </div>
        <button onClick={() => onCheck(server.id)} disabled={checking} style={buttonStyle}>
          {checking ? 'CHECKING' : 'CHECK'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <Badge label={server.status.replace('_', ' ')} color={statusColor(server.status)} />
        <Badge label={server.scope} color="purple" />
        <Badge label={server.driftStatus} color={server.driftStatus === 'changed' || server.driftStatus === 'missing' ? 'red' : 'muted'} />
      </div>

      <DetailRow label="SOURCE" value={server.source} />
      <DetailRow label="CONFIG" value={server.configPath || 'unknown'} />
      <DetailRow label="COMMAND" value={server.command || 'missing'} />
      <DetailRow label="URL" value={server.url || 'none'} />
      <DetailRow label="ARGS" value={server.args.length ? server.args.join(' ') : 'none'} />
      <DetailRow label="ENV KEYS" value={server.envKeys.length ? server.envKeys.join(', ') : 'none'} />
      <DetailRow label="REQUIRED ENV" value={server.requiredEnvKeys.length ? server.requiredEnvKeys.join(', ') : 'none'} />
      <DetailRow label="LAST SCANNED" value={new Date(server.lastSeenAt).toLocaleString()} />
      <DetailRow label="LAST CHECKED" value={server.lastCheckedAt ? new Date(server.lastCheckedAt).toLocaleString() : 'never'} />
      {server.healthMessage && <DetailRow label="HEALTH" value={server.healthMessage} />}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginTop: '12px' }}>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{value}</div>
    </div>
  )
}

function statusColor(status: string): 'amber' | 'teal' | 'purple' | 'red' | 'muted' {
  if (status === 'healthy') return 'teal'
  if (status === 'missing_env' || status === 'invalid_config' || status === 'unhealthy') return 'red'
  if (status === 'configured') return 'amber'
  return 'muted'
}

const emptyStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--text-muted)',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  letterSpacing: '0.14em',
  marginBottom: '5px',
}

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '24px',
  color: 'var(--amber)',
  letterSpacing: '0.08em',
  margin: '4px 0 0',
}

const valueStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--text)',
  lineHeight: 1.55,
  overflowWrap: 'anywhere',
}

const buttonStyle: React.CSSProperties = {
  padding: '7px 14px',
  border: '1px solid rgba(20,184,166,0.45)',
  borderRadius: '3px',
  background: 'rgba(20,184,166,0.08)',
  color: 'var(--teal)',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.1em',
  cursor: 'pointer',
}
