import { Router } from 'express'
import { loadConfig } from '../config'
import { runDreamEngine, getInsights, updateInsightStatus, getLastDreamRun } from '../services/dreamEngine'

export const dreamRouter = Router()

dreamRouter.get('/insights', (_req, res) => {
  try {
    const insights = getInsights()
    const lastRun = getLastDreamRun()
    res.json({ ok: true, insights, lastRun })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

dreamRouter.post('/run', async (_req, res) => {
  try {
    const config = loadConfig()
    const insights = await runDreamEngine(config)
    res.json({ ok: true, insights })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

dreamRouter.patch('/insights/:id', (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body as { status: 'applied' | 'skipped' }
    if (!['applied', 'skipped'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'status must be applied or skipped' })
    }
    updateInsightStatus(id, status)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})
