import fs from 'fs'
import path from 'path'
import os from 'os'
import { z } from 'zod'

const ConfigSchema = z.object({
  obsidianVaultPath: z.string(),
  projectsBasePath: z.string(),
  hourlyRate: z.number().positive(),
  claudeAvailable: z.boolean(),
  codexAvailable: z.boolean(),
  authToken: z.string().min(16),
})

export type Config = z.infer<typeof ConfigSchema>

const CONFIG_PATH = path.join(__dirname, '..', '..', '..', 'config', 'config.json')

let _config: Config | null = null

export function loadConfig(): Config {
  if (_config) return _config
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Config not found at ${CONFIG_PATH}. Run setup wizard first.`)
  }
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  const result = ConfigSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Invalid config: ${result.error.message}`)
  }
  _config = result.data
  return _config
}

export function configExists(): boolean {
  return fs.existsSync(CONFIG_PATH)
}

export function writeConfig(data: Config): void {
  const dir = path.dirname(CONFIG_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const result = ConfigSchema.safeParse(data)
  if (!result.success) throw new Error(`Invalid config data: ${result.error.message}`)
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(result.data, null, 2), 'utf-8')
  _config = result.data
}

export function getClaudePath(): string {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
  return path.join(appData, 'Claude')
}

export function getClaudePathCandidates(): string[] {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
  return Array.from(new Set([
    path.join(os.homedir(), '.claude'),
    path.join(appData, 'Claude'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'Claude'),
  ]))
}

export function getCodexPath(): string {
  return path.join(os.homedir(), '.codex')
}
