import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'

export type GraphifyStatus = 'unknown' | 'missing' | 'partial' | 'ready' | 'stale'

export interface ProjectScan {
  name: string
  path: string
  framework: string | null
  packageManager: string | null
  gitBranch: string | null
  gitDirty: boolean
  graphifyStatus: GraphifyStatus
  graphifyUpdatedAt: number | null
}

const ignoredDirs = new Set([
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  'node_modules',
  'graphify-out',
])

export function scanProject(projectPath: string): ProjectScan {
  const resolved = path.resolve(projectPath)
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`Project path is not a directory: ${resolved}`)
  }

  const packageJson = readPackageJson(resolved)

  return {
    name: path.basename(resolved),
    path: resolved,
    framework: detectFramework(resolved, packageJson),
    packageManager: detectPackageManager(resolved),
    gitBranch: gitValue(resolved, ['branch', '--show-current']),
    gitDirty: Boolean(gitValue(resolved, ['status', '--short'])),
    ...detectGraphify(resolved),
  }
}

function readPackageJson(projectPath: string): Record<string, unknown> | null {
  try {
    const raw = fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8')
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

function detectPackageManager(projectPath: string): string | null {
  if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) return 'yarn'
  if (fs.existsSync(path.join(projectPath, 'bun.lockb')) || fs.existsSync(path.join(projectPath, 'bun.lock'))) return 'bun'
  if (fs.existsSync(path.join(projectPath, 'package-lock.json'))) return 'npm'
  return null
}

function detectFramework(projectPath: string, packageJson: Record<string, unknown> | null): string | null {
  if (existsAny(projectPath, ['next.config.js', 'next.config.mjs', 'next.config.ts'])) return 'Next.js'
  if (existsAny(projectPath, ['vite.config.js', 'vite.config.mjs', 'vite.config.ts'])) return 'Vite'
  if (fs.existsSync(path.join(projectPath, 'pyproject.toml'))) return 'Python'
  if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) return 'Rust'
  if (fs.existsSync(path.join(projectPath, 'go.mod'))) return 'Go'

  const deps = {
    ...((packageJson?.dependencies as Record<string, string> | undefined) || {}),
    ...((packageJson?.devDependencies as Record<string, string> | undefined) || {}),
  }
  if (deps.next) return 'Next.js'
  if (deps.react) return 'React'
  if (deps.express) return 'Express'
  if (deps.vue) return 'Vue'
  if (deps.svelte) return 'Svelte'
  return packageJson ? 'Node.js' : null
}

function existsAny(projectPath: string, filenames: string[]): boolean {
  return filenames.some((filename) => fs.existsSync(path.join(projectPath, filename)))
}

function gitValue(projectPath: string, args: string[]): string | null {
  try {
    const output = execFileSync('git', ['-C', projectPath, ...args], {
      encoding: 'utf-8',
      timeout: 2500,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    return output || null
  } catch {
    return null
  }
}

function detectGraphify(projectPath: string): Pick<ProjectScan, 'graphifyStatus' | 'graphifyUpdatedAt'> {
  const outDir = path.join(projectPath, 'graphify-out')
  const graphJson = path.join(outDir, 'graph.json')
  const report = path.join(outDir, 'GRAPH_REPORT.md')
  if (!fs.existsSync(outDir)) return { graphifyStatus: 'missing', graphifyUpdatedAt: null }
  if (!fs.existsSync(graphJson)) return { graphifyStatus: 'partial', graphifyUpdatedAt: null }

  const graphUpdatedAt = fs.statSync(graphJson).mtimeMs
  const newestSource = newestSourceMtime(projectPath)
  const readyStatus = newestSource > graphUpdatedAt ? 'stale' : 'ready'
  return {
    graphifyStatus: fs.existsSync(report) ? readyStatus : 'partial',
    graphifyUpdatedAt: Math.round(graphUpdatedAt),
  }
}

function newestSourceMtime(projectPath: string): number {
  let newest = 0
  const stack = [projectPath]

  while (stack.length) {
    const current = stack.pop()!
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) stack.push(full)
        continue
      }
      if (!entry.isFile()) continue
      if (!isSourceFile(entry.name)) continue
      try {
        newest = Math.max(newest, fs.statSync(full).mtimeMs)
      } catch {
        // Ignore files that disappear during scan.
      }
    }
  }

  return newest
}

function isSourceFile(filename: string): boolean {
  return /\.(ts|tsx|js|jsx|py|rs|go|java|kt|md|json|toml|yaml|yml|css|scss|html)$/i.test(filename)
}
