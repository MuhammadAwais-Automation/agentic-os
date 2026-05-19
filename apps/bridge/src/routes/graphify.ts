import { Router } from 'express'
import { graphifyInstalled, parseGraphReport } from '../services/graphParser'
import {
  getGraphifyGraph,
  getGraphifyStatus,
  readGraphifyJson,
  readGraphifyText,
} from '../services/graphifyManager'

export const graphifyRouter = Router()

graphifyRouter.get('/check', (req, res) => {
  const projectPath = req.query['projectPath'] as string
  if (!projectPath) return res.status(400).json({ ok: false, error: 'projectPath required' })
  try {
    const installed = graphifyInstalled(projectPath)
    res.json({ ok: true, installed })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

graphifyRouter.get('/status', (req, res) => {
  try {
    const status = getGraphifyStatus(req.query['projectId'] as string | undefined, req.query['projectPath'] as string | undefined)
    res.json({ ok: true, status })
  } catch (err) {
    res.status(400).json({ ok: false, error: String(err) })
  }
})

graphifyRouter.get('/graph', (req, res) => {
  try {
    let graph
    if (req.query['projectId']) graph = getGraphifyGraph(req.query['projectId'] as string)
    else {
      const projectPath = req.query['projectPath'] as string
      if (!projectPath) return res.status(400).json({ ok: false, error: 'projectPath or projectId required' })
      graph = parseGraphReport(projectPath)
    }
    res.json({ ok: true, graph })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

graphifyRouter.get('/report', (req, res) => {
  try {
    const report = readGraphifyText('report', req.query['projectId'] as string | undefined, req.query['projectPath'] as string | undefined)
    res.json({ ok: true, report })
  } catch (err) {
    res.status(404).json({ ok: false, error: String(err) })
  }
})

graphifyRouter.get('/html', (req, res) => {
  try {
    const html = readGraphifyText('html', req.query['projectId'] as string | undefined, req.query['projectPath'] as string | undefined)
    res.json({ ok: true, html })
  } catch (err) {
    res.status(404).json({ ok: false, error: String(err) })
  }
})

graphifyRouter.get('/manifest', (req, res) => {
  try {
    const manifest = readGraphifyJson('manifest', req.query['projectId'] as string | undefined, req.query['projectPath'] as string | undefined)
    res.json({ ok: true, manifest })
  } catch (err) {
    res.status(404).json({ ok: false, error: String(err) })
  }
})
