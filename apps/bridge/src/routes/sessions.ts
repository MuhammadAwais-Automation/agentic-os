import { Router } from 'express'
import { execSync } from 'child_process'
import { parseAndStoreSessions, getSessionsFromDb, getTodayStats, getWeeklyCosts, getUsageLimits, getQuotaStatus } from '../services/sessionParser'

export const sessionsRouter = Router()

sessionsRouter.get('/', (_req, res) => {
  try {
    parseAndStoreSessions()
    const sessions = getSessionsFromDb()
    res.json({ ok: true, sessions })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

sessionsRouter.get('/today', (_req, res) => {
  try {
    parseAndStoreSessions()
    const stats = getTodayStats()
    res.json({ ok: true, ...stats })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

sessionsRouter.get('/weekly', (_req, res) => {
  try {
    parseAndStoreSessions()
    const data = getWeeklyCosts()
    res.json({ ok: true, data })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

sessionsRouter.get('/limits', (_req, res) => {
  try {
    parseAndStoreSessions()
    const limits = getUsageLimits()
    res.json({ ok: true, ...limits })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

sessionsRouter.get('/quota', (_req, res) => {
  try {
    parseAndStoreSessions()
    const quota = getQuotaStatus()
    res.json({ ok: true, ...quota })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

sessionsRouter.get('/active', (_req, res) => {
  try {
    const out = execSync('tasklist /FI "IMAGENAME eq claude.exe" /FO CSV /NH').toString()
    const active = out.toLowerCase().includes('claude.exe')
    res.json({ ok: true, active })
  } catch {
    res.json({ ok: true, active: false })
  }
})
