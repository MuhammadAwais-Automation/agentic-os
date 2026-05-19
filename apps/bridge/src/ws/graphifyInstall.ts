import { WebSocket } from 'ws'
import { spawn } from 'child_process'
import { loadConfig } from '../config'

function runCommand(cmd: string, args: string[], cwd: string, ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { shell: false, cwd })
    proc.stdout.on('data', (d: Buffer) => {
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: 'stdout', data: d.toString() }))
    })
    proc.stderr.on('data', (d: Buffer) => {
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: 'stdout', data: d.toString() }))
    })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} exited with code ${code}`))
    })
  })
}

export async function handleGraphifyInstallWs(ws: WebSocket, projectPath: string, token: string): Promise<void> {
  const config = loadConfig()
  if (token !== config.authToken) {
    ws.send(JSON.stringify({ type: 'error', data: 'Unauthorized' }))
    ws.close(1008)
    return
  }

  try {
    ws.send(JSON.stringify({ type: 'stdout', data: '[1/2] Checking graphify CLI...\r\n' }))
    await runCommand('graphify', ['--help'], projectPath, ws)

    ws.send(JSON.stringify({ type: 'stdout', data: '\r\n[2/2] Running graphify install --platform claude...\r\n' }))
    await runCommand('graphify', ['install', '--platform', 'claude'], projectPath, ws)

    ws.send(JSON.stringify({ type: 'done', data: '\r\n[done] Graphify installed successfully.\r\n' }))
    ws.close()
  } catch (err) {
    ws.send(JSON.stringify({ type: 'error', data: '\r\n[error] ' + String(err) + '\r\n' }))
    ws.close()
  }
}
