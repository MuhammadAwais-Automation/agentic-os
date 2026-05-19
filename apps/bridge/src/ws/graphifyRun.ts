import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { WebSocket } from 'ws'
import { loadConfig } from '../config'
import { getDb } from '../db'
import { getGraphifyStatus, persistGraphifyStatus, resolveGraphifyProject } from '../services/graphifyManager'

type GraphifyAction = 'install' | 'build' | 'update'

function send(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
}

function normalizeAction(value: string | null): GraphifyAction {
  if (value === 'install' || value === 'update' || value === 'build') return value
  return 'build'
}

function commandFor(action: GraphifyAction, projectPath: string): { cmd: string; args: string[]; title: string } {
  if (action === 'install') return { cmd: 'graphify', args: ['install', '--platform', 'claude'], title: 'Graphify install' }
  if (action === 'update') return { cmd: 'graphify', args: ['update', projectPath], title: 'Graphify update' }
  return { cmd: 'graphify', args: ['extract', projectPath], title: 'Graphify build' }
}

export function handleGraphifyRunWs(ws: WebSocket, url: string): void {
  const params = new URLSearchParams(url.split('?')[1] || '')
  const token = params.get('token') || ''
  const action = normalizeAction(params.get('action'))
  let runId = ''

  try {
    const config = loadConfig()
    if (token !== config.authToken) {
      send(ws, { type: 'error', data: 'Unauthorized' })
      ws.close(1008)
      return
    }

    const project = resolveGraphifyProject(params.get('projectId') || undefined, params.get('projectPath') || undefined)
    const active = project.projectId
      ? getDb().prepare("SELECT id FROM agent_runs WHERE project_id = ? AND provider = 'graphify' AND status = 'running' LIMIT 1").get(project.projectId) as { id: string } | undefined
      : undefined
    if (active) {
      send(ws, { type: 'error', data: `Graphify run already active: ${active.id}` })
      ws.close(1013)
      return
    }

    const command = commandFor(action, project.projectPath)
    runId = randomUUID()
    getDb()
      .prepare(`
        INSERT INTO agent_runs
          (id, provider, project_id, project_path, command, status, started_at, mode, title)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(runId, 'graphify', project.projectId, project.projectPath, [command.cmd, ...command.args].join(' '), 'running', Date.now(), `graphify-${action}`, command.title)

    if (project.projectId) persistGraphifyStatus(project.projectId, 'building', null, runId, null)

    send(ws, { type: 'ready', runId, action, projectId: project.projectId, cwd: project.projectPath })
    writeLog(runId, 'system', `[graphify ${action} started]\r\n`)

    const proc = spawn(command.cmd, command.args, {
      shell: false,
      cwd: project.projectPath,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    proc.stdout.on('data', (chunk: Buffer) => {
      const data = chunk.toString()
      writeLog(runId, 'stdout', data)
      send(ws, { type: 'stdout', data })
    })
    proc.stderr.on('data', (chunk: Buffer) => {
      const data = chunk.toString()
      writeLog(runId, 'stderr', data)
      send(ws, { type: 'stderr', data })
    })
    proc.on('close', (code) => {
      const status = code === 0 ? 'exited' : 'error'
      getDb().prepare('UPDATE agent_runs SET status = ?, ended_at = ?, exit_code = ? WHERE id = ?').run(status, Date.now(), code, runId)
      writeLog(runId, 'system', `\r\n[graphify exited with code ${code}]\r\n`)
      if (project.projectId) {
        if (code === 0) {
          const nextStatus = getGraphifyStatus(project.projectId)
          persistGraphifyStatus(project.projectId, nextStatus.status === 'building' ? 'ready' : nextStatus.status, nextStatus.updatedAt, runId, null)
        } else {
          persistGraphifyStatus(project.projectId, 'failed', null, runId, `graphify exited with code ${code}`)
        }
      }
      send(ws, { type: 'done', code, runId })
      ws.close()
    })
    ws.on('close', () => {
      if (!proc.killed) {
        try { proc.kill() } catch { /* ignore */ }
      }
    })
  } catch (err) {
    send(ws, { type: 'error', data: String(err) })
    if (runId) {
      getDb().prepare('UPDATE agent_runs SET status = ?, ended_at = ? WHERE id = ?').run('error', Date.now(), runId)
    }
    ws.close()
  }
}

function writeLog(runId: string, stream: string, data: string): void {
  getDb().prepare('INSERT INTO run_logs (run_id, ts, stream, data) VALUES (?, ?, ?, ?)').run(runId, Date.now(), stream, data)
}
