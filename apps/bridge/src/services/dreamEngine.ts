import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getDb } from '../db'
import { getClaudePath, Config } from '../config'

export interface Insight {
  id: string
  type: 'skill' | 'model' | 'memory' | 'graphify'
  title: string
  reason: string
  roi: string
  status: 'pending' | 'applied' | 'skipped'
  created_at: number
  acted_at: number | null
}

export async function runDreamEngine(config: Config): Promise<Insight[]> {
  const db = getDb()
  const claudePath = getClaudePath()
  const historyFile = path.join(claudePath, 'history.jsonl')
  const memoryDir = path.join(claudePath, 'memory')
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  const insights: Omit<Insight, 'id' | 'created_at' | 'status' | 'acted_at'>[] = []

  // 1. Repeated manual tasks (3+ times in 7 days)
  if (fs.existsSync(historyFile)) {
    const lines = fs.readFileSync(historyFile, 'utf-8').split('\n').filter(Boolean)
    const taskMap = new Map<string, { count: number }>()
    let opusSessions = 0

    for (const line of lines) {
      try {
        const data = JSON.parse(line)
        if (!data.timestamp || new Date(data.timestamp).getTime() < sevenDaysAgo) continue

        if (data.type === 'human' && typeof data.content === 'string') {
          const key = data.content.toLowerCase().slice(0, 60).trim()
          if (key.length >= 10) {
            taskMap.set(key, { count: (taskMap.get(key)?.count || 0) + 1 })
          }
        }

        if (data.model?.toLowerCase().includes('opus') && (data.usage?.input_tokens || 0) < 2000) {
          opusSessions++
        }
      } catch { /* skip */ }
    }

    const repeated = Array.from(taskMap.entries()).filter(([, v]) => v.count >= 3).slice(0, 1)
    for (const [pattern, { count }] of repeated) {
      const hoursSaved = (count * 5) / 60
      insights.push({
        type: 'skill',
        title: `Create skill for: "${pattern.slice(0, 40)}..."`,
        reason: `Done ${count}x in last 7 days. Each run ~5 min.`,
        roi: `~$${(hoursSaved * config.hourlyRate).toFixed(0)}/week at $${config.hourlyRate}/hr`,
      })
    }

    if (opusSessions >= 3) {
      insights.push({
        type: 'model',
        title: `Switch ${opusSessions} Opus sessions to Haiku`,
        reason: `${opusSessions} sessions used Opus for small tasks (<2k tokens).`,
        roi: `~$${(opusSessions * 0.02).toFixed(2)} saved per similar week`,
      })
    }
  }

  // 2. Stale memory files
  if (fs.existsSync(memoryDir)) {
    const stale = fs.readdirSync(memoryDir)
      .filter(f => f.endsWith('.md'))
      .filter(f => Date.now() - fs.statSync(path.join(memoryDir, f)).mtimeMs > 14 * 24 * 60 * 60 * 1000)

    if (stale.length > 0) {
      insights.push({
        type: 'memory',
        title: `Refresh ${stale.length} stale memory file${stale.length > 1 ? 's' : ''}`,
        reason: `${stale.length} file${stale.length > 1 ? 's' : ''} not updated in 14+ days.`,
        roi: `Better responses = ~${stale.length * 10} min/week saved`,
      })
    }
  }

  // 3. Projects missing Graphify
  if (fs.existsSync(config.projectsBasePath)) {
    const missing = fs.readdirSync(config.projectsBasePath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => path.join(config.projectsBasePath, d.name))
      .filter(p => !fs.existsSync(path.join(p, 'graphify-out', 'GRAPH_REPORT.md')))
      .slice(0, 3)

    if (missing.length > 0) {
      insights.push({
        type: 'graphify',
        title: `Install Graphify in ${missing.length} project${missing.length > 1 ? 's' : ''}`,
        reason: `${missing.length} project${missing.length > 1 ? 's' : ''} missing code knowledge graph.`,
        roi: `~20% fewer clarification messages per project`,
      })
    }
  }

  const now = Date.now()
  const insert = db.prepare(`
    INSERT OR REPLACE INTO insights (id, type, title, reason, roi, status, created_at, acted_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, NULL)
  `)

  const result: Insight[] = insights.slice(0, 4).map(ins => {
    const id = crypto.randomUUID()
    insert.run(id, ins.type, ins.title, ins.reason, ins.roi, now)
    return { ...ins, id, status: 'pending' as const, created_at: now, acted_at: null }
  })

  db.prepare('INSERT INTO dream_runs (ran_at, insights_generated) VALUES (?, ?)').run(now, result.length)
  return result
}

export function getInsights(): Insight[] {
  return getDb().prepare('SELECT * FROM insights ORDER BY created_at DESC').all() as Insight[]
}

export function updateInsightStatus(id: string, status: 'applied' | 'skipped'): void {
  getDb().prepare('UPDATE insights SET status = ?, acted_at = ? WHERE id = ?').run(status, Date.now(), id)
}

export function getLastDreamRun(): { ran_at: number; insights_generated: number } | null {
  return getDb().prepare('SELECT * FROM dream_runs ORDER BY ran_at DESC LIMIT 1').get() as { ran_at: number; insights_generated: number } | null
}
