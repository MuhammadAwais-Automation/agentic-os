import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(__dirname, '..', '..', '..', 'config')
const DB_PATH = path.join(DB_DIR, 'agentic-os.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  migrate(_db)
  return _db
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      duration_ms INTEGER,
      model TEXT,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0,
      raw_path TEXT,
      source TEXT NOT NULL DEFAULT 'claude'
    );

    CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      reason TEXT NOT NULL,
      roi TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      acted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS dream_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ran_at INTEGER NOT NULL,
      insights_generated INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS memory_refreshes (
      filename TEXT PRIMARY KEY,
      refreshed_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      last_opened_at INTEGER,
      framework TEXT,
      package_manager TEXT,
      git_branch TEXT,
      git_dirty INTEGER NOT NULL DEFAULT 0,
      graphify_status TEXT NOT NULL DEFAULT 'unknown',
      graphify_updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      project_path TEXT NOT NULL,
      command TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      exit_code INTEGER
    );

    CREATE TABLE IF NOT EXISTS run_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      ts INTEGER NOT NULL,
      stream TEXT NOT NULL,
      data TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES agent_runs(id)
    );

    CREATE TABLE IF NOT EXISTS catalog_items (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      project_id TEXT,
      project_path TEXT,
      tags TEXT,
      installed_for_claude INTEGER NOT NULL DEFAULT 0,
      installed_for_codex INTEGER NOT NULL DEFAULT 0,
      last_seen_at INTEGER NOT NULL,
      last_used_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS catalog_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL,
      run_id TEXT,
      project_id TEXT,
      project_path TEXT,
      used_at INTEGER NOT NULL,
      FOREIGN KEY (item_id) REFERENCES catalog_items(id)
    );

    CREATE TABLE IF NOT EXISTS prompt_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT,
      item_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (item_id) REFERENCES catalog_items(id)
    );

    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      scope TEXT NOT NULL,
      project_id TEXT,
      project_path TEXT,
      command TEXT,
      url TEXT,
      args TEXT,
      env_keys TEXT,
      required_env_keys TEXT,
      missing_env_keys TEXT,
      status TEXT NOT NULL,
      drift_status TEXT NOT NULL DEFAULT 'unknown',
      config_path TEXT,
      last_seen_at INTEGER NOT NULL,
      last_checked_at INTEGER,
      health_message TEXT
    );

    CREATE TABLE IF NOT EXISTS mcp_health_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT NOT NULL,
      checked_at INTEGER NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      duration_ms INTEGER,
      FOREIGN KEY (server_id) REFERENCES mcp_servers(id)
    );
  `)

  addColumnIfMissing(db, 'agent_runs', 'project_id', 'TEXT')
  addColumnIfMissing(db, 'agent_runs', 'mode', "TEXT NOT NULL DEFAULT 'terminal'")
  addColumnIfMissing(db, 'agent_runs', 'title', 'TEXT')
  addColumnIfMissing(db, 'projects', 'graphify_last_run_id', 'TEXT')
  addColumnIfMissing(db, 'projects', 'graphify_last_error', 'TEXT')
  addColumnIfMissing(db, 'projects', 'graphify_building_at', 'INTEGER')
  addColumnIfMissing(db, 'mcp_servers', 'url', 'TEXT')
}

function addColumnIfMissing(db: Database.Database, table: string, column: string, definition: string): void {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (!rows.some((row) => row.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run()
  }
}
