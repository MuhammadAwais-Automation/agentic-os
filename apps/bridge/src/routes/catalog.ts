import { Router } from 'express'
import { getDb } from '../db'
import {
  catalogSummary,
  formatCatalogItem,
  getCatalogItem,
  listCatalogItems,
  refreshCatalog,
} from '../services/catalogScanner'

export const catalogRouter = Router()

catalogRouter.get('/items', (req, res) => {
  try {
    const items = listCatalogItems({
      kind: req.query['kind'] as string | undefined,
      category: req.query['category'] as string | undefined,
      source: req.query['source'] as string | undefined,
      target: req.query['target'] as string | undefined,
      q: req.query['q'] as string | undefined,
      projectId: req.query['projectId'] as string | undefined,
    })
    res.json({ ok: true, items })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

catalogRouter.get('/items/:id', (req, res) => {
  try {
    res.json({ ok: true, item: getCatalogItem(req.params.id) })
  } catch (err) {
    res.status(404).json({ ok: false, error: String(err) })
  }
})

catalogRouter.post('/refresh', (req, res) => {
  try {
    const result = refreshCatalog(req.body?.projectId)
    res.json({ ok: true, scanned: result.scanned, items: result.items })
  } catch (err) {
    res.status(400).json({ ok: false, error: String(err) })
  }
})

catalogRouter.get('/summary', (req, res) => {
  try {
    res.json({ ok: true, summary: catalogSummary(req.query['projectId'] as string | undefined) })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

catalogRouter.post('/usage', (req, res) => {
  try {
    const itemId = String(req.body?.itemId || '')
    if (!itemId) return res.status(400).json({ ok: false, error: 'itemId required' })
    const projectId = req.body?.projectId ? String(req.body.projectId) : null
    const runId = req.body?.runId ? String(req.body.runId) : null
    const projectPath = projectId
      ? (getDb().prepare('SELECT path FROM projects WHERE id = ?').get(projectId) as { path: string } | undefined)?.path ?? null
      : null
    const now = Date.now()
    getDb()
      .prepare('INSERT INTO catalog_usage (item_id, run_id, project_id, project_path, used_at) VALUES (?, ?, ?, ?, ?)')
      .run(itemId, runId, projectId, projectPath, now)
    getDb().prepare('UPDATE catalog_items SET last_used_at = ? WHERE id = ?').run(now, itemId)
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ ok: false, error: String(err) })
  }
})

catalogRouter.get('/attachments', (req, res) => {
  try {
    const projectId = req.query['projectId'] as string | undefined
    const rows = getDb()
      .prepare(`
        SELECT a.id AS attachment_id, a.project_id AS attachment_project_id, a.created_at,
               i.*
        FROM prompt_attachments a
        JOIN catalog_items i ON i.id = a.item_id
        WHERE (? IS NULL AND a.project_id IS NULL) OR a.project_id IS NULL OR a.project_id = ?
        ORDER BY a.created_at ASC
      `)
      .all(projectId ?? null, projectId ?? null)
    res.json({
      ok: true,
      attachments: rows.map((row: any) => ({
        id: row.attachment_id,
        projectId: row.attachment_project_id ?? null,
        createdAt: row.created_at,
        item: formatCatalogItem(row),
      })),
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

catalogRouter.post('/attachments', (req, res) => {
  try {
    const itemId = String(req.body?.itemId || '')
    if (!itemId) return res.status(400).json({ ok: false, error: 'itemId required' })
    const projectId = req.body?.projectId ? String(req.body.projectId) : null
    const exists = getDb().prepare('SELECT id FROM catalog_items WHERE id = ?').get(itemId)
    if (!exists) return res.status(404).json({ ok: false, error: 'Catalog item not found' })
    const duplicate = getDb()
      .prepare('SELECT id FROM prompt_attachments WHERE item_id = ? AND COALESCE(project_id, \'\') = COALESCE(?, \'\')')
      .get(itemId, projectId) as { id: number } | undefined
    if (duplicate) return res.json({ ok: true, attachmentId: duplicate.id })
    const info = getDb()
      .prepare('INSERT INTO prompt_attachments (project_id, item_id, created_at) VALUES (?, ?, ?)')
      .run(projectId, itemId, Date.now())
    res.json({ ok: true, attachmentId: info.lastInsertRowid })
  } catch (err) {
    res.status(400).json({ ok: false, error: String(err) })
  }
})

catalogRouter.delete('/attachments/:id', (req, res) => {
  getDb().prepare('DELETE FROM prompt_attachments WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})
