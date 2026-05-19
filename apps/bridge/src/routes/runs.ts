import { Router } from 'express'
import { getDb } from '../db'

export const runsRouter = Router()

runsRouter.get('/', (req, res) => {
  try {
    const projectId = req.query.projectId ? String(req.query.projectId) : ''
    const projectPath = req.query.projectPath ? String(req.query.projectPath) : ''
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200)

    const clauses: string[] = []
    const values: unknown[] = []
    if (projectId) {
      clauses.push('r.project_id = ?')
      values.push(projectId)
    }
    if (projectPath) {
      clauses.push('r.project_path = ?')
      values.push(projectPath)
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const rows = getDb()
      .prepare(`
        SELECT r.id, r.provider, r.project_id, r.project_path, r.command, r.status,
               r.started_at, r.ended_at, r.exit_code, r.mode, r.title,
               p.name AS project_name,
               (
                 SELECT data FROM run_logs l
                 WHERE l.run_id = r.id AND l.stream != 'stdin'
                 ORDER BY l.ts DESC, l.id DESC LIMIT 1
               ) AS last_log
        FROM agent_runs r
        LEFT JOIN projects p ON p.id = r.project_id
        ${where}
        ORDER BY r.started_at DESC
        LIMIT ?
      `)
      .all(...values, limit)

    res.json({ ok: true, runs: rows.map(formatRunListItem) })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

runsRouter.get('/:id', (req, res) => {
  const row = getDb()
    .prepare(`
      SELECT r.*, p.name AS project_name
      FROM agent_runs r
      LEFT JOIN projects p ON p.id = r.project_id
      WHERE r.id = ?
    `)
    .get(req.params.id)
  if (!row) return res.status(404).json({ ok: false, error: 'Run not found' })
  res.json({ ok: true, run: formatRun(row) })
})

runsRouter.get('/:id/logs', (req, res) => {
  const rows = getDb()
    .prepare('SELECT id, run_id, ts, stream, data FROM run_logs WHERE run_id = ? ORDER BY ts ASC, id ASC')
    .all(req.params.id)
  res.json({
    ok: true,
    logs: rows.map((row: any) => ({
      id: row.id,
      runId: row.run_id,
      ts: row.ts,
      stream: row.stream,
      data: row.data,
    })),
  })
})

runsRouter.patch('/:id/title', (req, res) => {
  const title = String(req.body?.title || '').slice(0, 160)
  getDb().prepare('UPDATE agent_runs SET title = ? WHERE id = ?').run(title || null, req.params.id)
  const row = getDb().prepare('SELECT * FROM agent_runs WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ ok: false, error: 'Run not found' })
  res.json({ ok: true, run: formatRun(row) })
})

function formatRunListItem(row: any) {
  const startedAt = row.started_at
  const endedAt = row.ended_at ?? null
  return {
    id: row.id,
    provider: row.provider,
    projectId: row.project_id ?? null,
    projectPath: row.project_path,
    projectName: row.project_name ?? null,
    command: row.command,
    status: row.status,
    startedAt,
    endedAt,
    durationMs: endedAt ? endedAt - startedAt : null,
    exitCode: row.exit_code ?? null,
    mode: row.mode ?? 'terminal',
    title: row.title ?? null,
    lastLog: row.last_log ? String(row.last_log).slice(-220) : '',
  }
}

function formatRun(row: any) {
  return {
    ...formatRunListItem({ ...row, last_log: '' }),
    projectName: row.project_name ?? null,
  }
}
