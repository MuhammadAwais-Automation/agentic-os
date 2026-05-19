import { Router } from 'express'
import {
  checkMcpServer,
  getMcpSummary,
  listMcpServers,
  refreshMcpServers,
} from '../services/mcpScanner'

export const mcpRouter = Router()

mcpRouter.get('/servers', (req, res) => {
  try {
    res.json({ ok: true, servers: listMcpServers(req.query['projectId'] as string | undefined) })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

mcpRouter.get('/summary', (req, res) => {
  try {
    res.json({ ok: true, summary: getMcpSummary(req.query['projectId'] as string | undefined) })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

mcpRouter.post('/refresh', (req, res) => {
  try {
    const projectId = req.body?.projectId ? String(req.body.projectId) : undefined
    const result = refreshMcpServers(projectId)
    res.json({ ok: true, scanned: result.scanned, servers: result.servers })
  } catch (err) {
    res.status(400).json({ ok: false, error: String(err) })
  }
})

mcpRouter.post('/check', (req, res) => {
  try {
    const serverId = String(req.body?.serverId || '')
    if (!serverId) return res.status(400).json({ ok: false, error: 'serverId required' })
    res.json({ ok: true, server: checkMcpServer(serverId) })
  } catch (err) {
    res.status(400).json({ ok: false, error: String(err) })
  }
})
