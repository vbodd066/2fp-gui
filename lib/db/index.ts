/* ============================================================
 * Database — SQLite connection singleton with auto-migration
 * ============================================================
 * Uses better-sqlite3 for synchronous, fast SQLite access.
 *
 * The database file lives at <project-root>/data/2fp.db and is
 * created automatically on first access. Tables are created
 * via idempotent CREATE IF NOT EXISTS statements.
 *
 * Usage:
 *   import { db } from "@/lib/db";
 *   const row = db.prepare("SELECT …").get(…);
 * ============================================================ */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

/* ---- database path ---- */

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "2fp.db");

/* ---- singleton ---- */

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  /* Ensure the data directory exists */
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  _db = new Database(DB_PATH);

  /* Performance pragmas */
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  _db.pragma("busy_timeout = 5000");

  /* Run migrations */
  migrate(_db);

  return _db;
}

/* Convenience re-export */
export const db = new Proxy({} as Database.Database, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

/* ============================================================
 * Schema migrations
 * ============================================================ */

function migrate(database: Database.Database) {
  database.exec(`
    /* ---- users ---- */
    CREATE TABLE IF NOT EXISTS users (
      id                  TEXT PRIMARY KEY,
      email               TEXT NOT NULL UNIQUE,
      password_hash       TEXT NOT NULL,
      name                TEXT NOT NULL,
      organization        TEXT DEFAULT '',
      plan                TEXT NOT NULL DEFAULT 'starter',
      role                TEXT NOT NULL DEFAULT 'user',
      stripe_customer_id  TEXT DEFAULT NULL,
      access_code         TEXT DEFAULT NULL,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    /* ---- sessions ---- */
    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      token       TEXT NOT NULL UNIQUE,
      user_id     TEXT NOT NULL,
      expires_at  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    /* ---- subscriptions ---- */
    CREATE TABLE IF NOT EXISTS subscriptions (
      id                      TEXT PRIMARY KEY,
      user_id                 TEXT NOT NULL UNIQUE,
      stripe_subscription_id  TEXT DEFAULT NULL,
      plan                    TEXT NOT NULL DEFAULT 'starter',
      status                  TEXT NOT NULL DEFAULT 'active',
      current_period_start    TEXT DEFAULT NULL,
      current_period_end      TEXT DEFAULT NULL,
      created_at              TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    /* ---- indexes ---- */
    CREATE INDEX IF NOT EXISTS idx_sessions_token      ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user  ON subscriptions(user_id);

    /* ---- usage events ---- */
    CREATE TABLE IF NOT EXISTS usage_events (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL,
      tool            TEXT NOT NULL,
      stage           TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'completed',
      duration_ms     INTEGER NOT NULL DEFAULT 0,
      cpu_seconds     REAL NOT NULL DEFAULT 0,
      storage_bytes   INTEGER NOT NULL DEFAULT 0,
      cost_cents      INTEGER NOT NULL DEFAULT 0,
      metadata        TEXT DEFAULT '{}',
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_usage_user       ON usage_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_usage_created     ON usage_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_usage_tool        ON usage_events(tool);
  `);

  /* ---- additive column migrations ---- */
  const cols = database
    .prepare("PRAGMA table_info(users)")
    .all() as { name: string }[];
  const colNames = new Set(cols.map((c) => c.name));

  if (!colNames.has("role")) {
    database.exec(
      `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`
    );
  }
}
