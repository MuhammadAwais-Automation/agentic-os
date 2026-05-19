import { WebSocket } from 'ws'
import { spawn } from 'child_process'
import { loadConfig } from '../config'

export function handleClaudeWs(ws: WebSocket): void {
  ws.once('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as { token: string; prompt: string; projectPath?: string }
      const config = loadConfig()
      if (msg.token !== config.authToken) {
        ws.send(JSON.stringify({ type: 'error', data: 'Unauthorized' }))
        ws.close(1008)
        return
      }

      const proc = spawn('claude', ['--print', msg.prompt], {
        shell: true,
        cwd: msg.projectPath || process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      proc.stdout.on('data', (d: Buffer) => {
        if (ws.readyState === WebSocket.OPEN)
          ws.send(JSON.stringify({ type: 'stdout', data: d.toString() }))
      })
      proc.stderr.on('data', (d: Buffer) => {
        if (ws.readyState === WebSocket.OPEN)
          ws.send(JSON.stringify({ type: 'stderr', data: d.toString() }))
      })
      proc.on('close', (code) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'done', data: `\r\n[Process exited with code ${code}]` }))
          ws.close()
        }
      })

      ws.on('close', () => { try { proc.kill() } catch { /* ignore */ } })
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', data: String(err) }))
      ws.close()
    }
  })
}
