import express from 'express'
import cors from 'cors'
import http from 'http'
import { WebSocketServer } from 'ws'
import cron from 'node-cron'
import { getDb } from './db'
import { loadConfig, configExists, writeConfig } from './config'
import { authMiddleware } from './auth'
import { sessionsRouter } from './routes/sessions'
import { memoryRouter } from './routes/memory'
import { dreamRouter } from './routes/dream'
import { graphifyRouter } from './routes/graphify'
import { catalogRouter } from './routes/catalog'
import { mcpRouter } from './routes/mcp'
import { projectsRouter } from './routes/projects'
import { runsRouter } from './routes/runs'
import { handleClaudeWs } from './ws/claude'
import { handleCodexWs } from './ws/codex'
import { handleGraphifyInstallWs } from './ws/graphifyInstall'
import { handleGraphifyRunWs } from './ws/graphifyRun'
import { handleTerminalWs } from './ws/terminal'
import { runDreamEngine } from './services/dreamEngine'

const PORT = 3001
const app = express()

app.use(cors({ origin: 'http://localhost:3000' }))
app.use(express.json())

// Config check + write endpoint (no auth — used by setup wizard)
app.get('/api/config/status', (_req, res) => {
  res.json({ configured: configExists() })
})

app.get('/api/config', authMiddleware, (_req, res) => {
  try {
    const config = loadConfig()
    res.json({
      ok: true,
      config: {
        obsidianVaultPath: config.obsidianVaultPath,
        projectsBasePath: config.projectsBasePath,
        hourlyRate: config.hourlyRate,
        claudeAvailable: config.claudeAvailable,
        codexAvailable: config.codexAvailable,
        authTokenConfigured: Boolean(config.authToken),
      },
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

app.post('/api/config', (req, res) => {
  try {
    writeConfig(req.body)
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

// Protected routes
app.use('/api/sessions', authMiddleware, sessionsRouter)
app.use('/api/memory', authMiddleware, memoryRouter)
app.use('/api/dream', authMiddleware, dreamRouter)
app.use('/api/graphify', authMiddleware, graphifyRouter)
app.use('/api/catalog', authMiddleware, catalogRouter)
app.use('/api/mcp', authMiddleware, mcpRouter)
app.use('/api/projects', authMiddleware, projectsRouter)
app.use('/api/runs', authMiddleware, runsRouter)

// Initialize DB on startup
try {
  getDb()
  console.log('[bridge] SQLite ready')
} catch (err) {
  console.error('[bridge] DB init failed:', err)
}

// Dream engine at 2:00 AM daily
cron.schedule('0 2 * * *', async () => {
  console.log('[bridge] Running dream engine (scheduled)')
  try {
    if (configExists()) {
      const config = loadConfig()
      await runDreamEngine(config)
    }
  } catch (err) {
    console.error('[bridge] Dream engine error:', err)
  }
})

const server = http.createServer(app)
const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  const url = req.url || ''
  if (url.startsWith('/ws/claude')) {
    handleClaudeWs(ws)
  } else if (url.startsWith('/ws/codex')) {
    handleCodexWs(ws)
  } else if (url.startsWith('/ws/terminal')) {
    handleTerminalWs(ws, url)
  } else if (url.startsWith('/ws/graphify-run')) {
    handleGraphifyRunWs(ws, url)
  } else if (url.startsWith('/ws/graphify-install')) {
    const params = new URLSearchParams(url.split('?')[1] || '')
    const projectPath = params.get('projectPath') || ''
    const token = params.get('token') || ''
    handleGraphifyInstallWs(ws, projectPath, token)
  } else {
    ws.close(1008, 'Unknown WS path')
  }
})

server.listen(PORT, () => {
  console.log(`[bridge] Listening on http://localhost:${PORT}`)
})
