import { WebSocket } from 'ws'
import { spawn } from 'child_process'
import { loadConfig } from '../config'

export function handleCodexWs(ws: WebSocket): void {
  ws.once('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as { token: string; prompt: string; projectPath?: string }
      const config = loadConfig()
      if (msg.token !== config.authToken) {
        ws.send(JSON.stringify({ error: 'Unauthorized' }))
        ws.close(1008)
        return
      }

      const proc = spawn('codex', ['-q', msg.prompt], {
        shell: true,
        cwd: msg.projectPath || process.cwd(),
      })

      proc.stdout.on('data', (d: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(d.toString())
      })
      proc.stderr.on('data', (d: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) ws.send('[stderr] ' + d.toString())
      })
      proc.on('close', (code) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(`\r\n[Process exited with code ${code}]`)
          ws.close()
        }
      })

      ws.on('close', () => { try { proc.kill() } catch { /* ignore */ } })
    } catch (err) {
      ws.send('[error] ' + String(err))
      ws.close()
    }
  })
}
