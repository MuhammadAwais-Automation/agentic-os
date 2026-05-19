import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { WebSocket } from 'ws'
import * as pty from 'node-pty'
import { loadConfig } from '../config'
import { getDb } from '../db'

type TerminalProvider = 'powershell' | 'claude' | 'codex'

type ClientMessage =
  | { type: 'input'; data: string }
  | { type: 'resize'; cols: number; rows: number }
  | { type: 'kill' }

const providers = new Set<TerminalProvider>(['powershell', 'claude', 'codex'])

function send(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload))
  }
}

function normalizeProvider(value: string | null): TerminalProvider {
  if (value && providers.has(value as TerminalProvider)) return value as TerminalProvider
  return 'powershell'
}

function resolveCwd(projectPath: string | null): string {
  if (!projectPath) return process.cwd()
  const resolved = path.resolve(projectPath)
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`Project path is not a directory: ${resolved}`)
  }
  return resolved
}

function resolveProject(projectId: string | null, projectPath: string | null): { projectId: string | null; cwd: string } {
  if (projectId) {
    const row = getDb().prepare('SELECT id, path FROM projects WHERE id = ?').get(projectId) as { id: string; path: string } | undefined
    if (!row) throw new Error(`Project not found: ${projectId}`)
    return { projectId: row.id, cwd: resolveCwd(row.path) }
  }
  return { projectId: null, cwd: resolveCwd(projectPath) }
}

function commandFor(provider: TerminalProvider): { command: string; args: string[] } {
  if (provider === 'claude') return { command: 'claude', args: [] }
  if (provider === 'codex') return { command: 'codex', args: [] }
  if (process.platform === 'win32') return { command: 'powershell.exe', args: ['-NoLogo'] }
  return { command: process.env.SHELL || 'bash', args: [] }
}

function writeLog(runId: string, stream: string, data: string): void {
  try {
    getDb()
      .prepare('INSERT INTO run_logs (run_id, ts, stream, data) VALUES (?, ?, ?, ?)')
      .run(runId, Date.now(), stream, data)
  } catch {
    // Terminal streaming should continue even if local log persistence fails.
  }
}

export function handleTerminalWs(ws: WebSocket, url: string): void {
  const params = new URLSearchParams(url.split('?')[1] || '')
  const token = params.get('token') || ''
  const provider = normalizeProvider(params.get('provider'))
  let attachedProjectId: string | null = null
  let runId = ''
  let term: pty.IPty | null = null
  let closed = false

  try {
    const config = loadConfig()
    if (token !== config.authToken) {
      send(ws, { type: 'error', data: 'Unauthorized' })
      ws.close(1008)
      return
    }

    const project = resolveProject(params.get('projectId'), params.get('projectPath'))
    const cwd = project.cwd
    attachedProjectId = project.projectId
    const cols = Number(params.get('cols') || 120)
    const rows = Number(params.get('rows') || 32)
    const { command, args } = commandFor(provider)
    runId = randomUUID()
    const title = provider === 'claude'
      ? 'Claude Code session'
      : provider === 'codex'
        ? 'Codex session'
        : 'PowerShell terminal'

    getDb()
      .prepare(`
        INSERT INTO agent_runs
          (id, provider, project_id, project_path, command, status, started_at, mode, title)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(runId, provider, attachedProjectId, cwd, [command, ...args].join(' '), 'running', Date.now(), 'terminal', title)

    if (attachedProjectId) {
      getDb().prepare('UPDATE projects SET last_opened_at = ? WHERE id = ?').run(Date.now(), attachedProjectId)
    }

    term = pty.spawn(command, args, {
      name: 'xterm-color',
      cols: Number.isFinite(cols) ? cols : 120,
      rows: Number.isFinite(rows) ? rows : 32,
      cwd,
      env: { ...process.env, TERM: 'xterm-256color', HOME: process.env.HOME || os.homedir() },
      // ts-node-dev + node-pty's Windows ConPTY cleanup helper can crash with
      // "AttachConsole failed". winpty mode avoids that helper in dev server use.
      useConpty: process.platform === 'win32' ? false : undefined,
    })

    send(ws, { type: 'ready', runId, provider, cwd, projectId: attachedProjectId })
    writeLog(runId, 'system', `[started ${provider} in ${cwd}]\r\n`)

    term.onData((data) => {
      writeLog(runId, 'stdout', data)
      send(ws, { type: 'output', data })
    })

    term.onExit(({ exitCode }) => {
      closed = true
      getDb()
        .prepare('UPDATE agent_runs SET status = ?, ended_at = ?, exit_code = ? WHERE id = ?')
        .run('exited', Date.now(), exitCode, runId)
      writeLog(runId, 'system', `\r\n[exited with code ${exitCode}]\r\n`)
      send(ws, { type: 'exit', code: exitCode })
      ws.close()
    })

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as ClientMessage
        if (!term) return
        if (msg.type === 'input') {
          writeLog(runId, 'stdin', msg.data)
          term.write(msg.data)
        }
        if (msg.type === 'resize') {
          term.resize(Math.max(20, msg.cols || 120), Math.max(8, msg.rows || 32))
        }
        if (msg.type === 'kill') {
          term.kill()
        }
      } catch (err) {
        send(ws, { type: 'error', data: String(err) })
      }
    })

    ws.on('close', () => {
      if (!closed && term) {
        try { term.kill() } catch { /* ignore */ }
        getDb()
          .prepare('UPDATE agent_runs SET status = ?, ended_at = ? WHERE id = ?')
          .run('cancelled', Date.now(), runId)
        writeLog(runId, 'system', '\r\n[cancelled by client]\r\n')
      }
    })
  } catch (err) {
    send(ws, { type: 'error', data: String(err) })
    if (runId) {
      try {
        getDb()
          .prepare('UPDATE agent_runs SET status = ?, ended_at = ? WHERE id = ?')
          .run('error', Date.now(), runId)
      } catch { /* ignore */ }
    }
    ws.close()
  }
}
