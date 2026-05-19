import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { getDb } from '../db'
import { getClaudePath } from '../config'

export const memoryRouter = Router()

memoryRouter.get('/', (_req, res) => {
  try {
    const memoryDir = path.join(getClaudePath(), 'memory')
    if (!fs.existsSync(memoryDir)) {
      return res.json({ ok: true, files: [], healthScore: 100 })
    }

    const db = getDb()
    const refreshes = db.prepare('SELECT filename, refreshed_at FROM memory_refreshes').all() as { filename: string; refreshed_at: number }[]
    const refreshMap = new Map(refreshes.map(r => [r.filename, r.refreshed_at]))

    const files = fs.readdirSync(memoryDir)
      .filter(f => f.endsWith('.md') || f.endsWith('.txt'))
      .map(filename => {
        const stat = fs.statSync(path.join(memoryDir, filename))
        const lastModified = stat.mtimeMs
        const refreshedAt = refreshMap.get(filename) || null
        const effectiveDate = refreshedAt ? Math.max(lastModified, refreshedAt) : lastModified
        const ageDays = (Date.now() - effectiveDate) / (1000 * 60 * 60 * 24)
        const staleness: 'fresh' | 'warning' | 'stale' =
          ageDays > 14 ? 'stale' : ageDays > 7 ? 'warning' : 'fresh'
        return { filename, lastModified, refreshedAt, ageDays: Math.floor(ageDays), staleness }
      })
      .sort((a, b) => b.ageDays - a.ageDays)

    const freshCount = files.filter(f => f.staleness === 'fresh').length
    const healthScore = files.length > 0 ? Math.round((freshCount / files.length) * 100) : 100

    res.json({ ok: true, files, healthScore })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

memoryRouter.patch('/:filename/refresh', (req, res) => {
  try {
    const { filename } = req.params
    getDb().prepare('INSERT OR REPLACE INTO memory_refreshes (filename, refreshed_at) VALUES (?, ?)').run(filename, Date.now())
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})
