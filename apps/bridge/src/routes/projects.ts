import { Router } from 'express'
import { randomUUID } from 'crypto'
import { getDb } from '../db'
import { scanProject } from '../services/projectScanner'

export const projectsRouter = Router()

projectsRouter.get('/', (_req, res) => {
  try {
    const rows = getDb()
      .prepare(`
        SELECT id, name, path, created_at, last_opened_at, framework, package_manager,
               git_branch, git_dirty, graphify_status, graphify_updated_at
        FROM projects
        ORDER BY COALESCE(last_opened_at, created_at) DESC
      `)
      .all()
    res.json({ ok: true, projects: rows.map(formatProject) })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

projectsRouter.post('/', (req, res) => {
  try {
    const projectPath = String(req.body?.path || '')
    const scan = scanProject(projectPath)
    const now = Date.now()
    const existing = getDb().prepare('SELECT id FROM projects WHERE path = ?').get(scan.path) as { id: string } | undefined
    const id = existing?.id || randomUUID()

    getDb()
      .prepare(`
        INSERT INTO projects
          (id, name, path, created_at, last_opened_at, framework, package_manager,
           git_branch, git_dirty, graphify_status, graphify_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
          name = excluded.name,
          last_opened_at = excluded.last_opened_at,
          framework = excluded.framework,
          package_manager = excluded.package_manager,
          git_branch = excluded.git_branch,
          git_dirty = excluded.git_dirty,
          graphify_status = excluded.graphify_status,
          graphify_updated_at = excluded.graphify_updated_at
      `)
      .run(
        id,
        scan.name,
        scan.path,
        now,
        now,
        scan.framework,
        scan.packageManager,
        scan.gitBranch,
        scan.gitDirty ? 1 : 0,
        scan.graphifyStatus,
        scan.graphifyUpdatedAt,
      )

    const row = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id)
    res.json({ ok: true, project: formatProject(row) })
  } catch (err) {
    res.status(400).json({ ok: false, error: String(err) })
  }
})

projectsRouter.get('/:id', (req, res) => {
  const row = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ ok: false, error: 'Project not found' })
  res.json({ ok: true, project: formatProject(row) })
})

projectsRouter.patch('/:id/open', (req, res) => {
  try {
    getDb().prepare('UPDATE projects SET last_opened_at = ? WHERE id = ?').run(Date.now(), req.params.id)
    const row = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ ok: false, error: 'Project not found' })
    res.json({ ok: true, project: formatProject(row) })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

projectsRouter.patch('/:id/refresh', (req, res) => {
  try {
    const existing = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as { path: string } | undefined
    if (!existing) return res.status(404).json({ ok: false, error: 'Project not found' })
    const scan = scanProject(existing.path)
    getDb()
      .prepare(`
        UPDATE projects
        SET name = ?, framework = ?, package_manager = ?, git_branch = ?, git_dirty = ?,
            graphify_status = ?, graphify_updated_at = ?, last_opened_at = ?
        WHERE id = ?
      `)
      .run(
        scan.name,
        scan.framework,
        scan.packageManager,
        scan.gitBranch,
        scan.gitDirty ? 1 : 0,
        scan.graphifyStatus,
        scan.graphifyUpdatedAt,
        Date.now(),
        req.params.id,
      )
    const row = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
    res.json({ ok: true, project: formatProject(row) })
  } catch (err) {
    res.status(400).json({ ok: false, error: String(err) })
  }
})

projectsRouter.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM projects WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

function formatProject(row: any) {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    createdAt: row.created_at,
    lastOpenedAt: row.last_opened_at ?? null,
    framework: row.framework ?? null,
    packageManager: row.package_manager ?? null,
    gitBranch: row.git_branch ?? null,
    gitDirty: Boolean(row.git_dirty),
    graphifyStatus: row.graphify_status,
    graphifyUpdatedAt: row.graphify_updated_at ?? null,
  }
}
