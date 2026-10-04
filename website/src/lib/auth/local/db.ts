import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * Ordered schema migrations, tracked with SQLite's `user_version` pragma.
 * Append new entries; never edit one that has shipped.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE users (
    id                 TEXT PRIMARY KEY,
    email              TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name               TEXT NOT NULL DEFAULT '',
    password_hash      TEXT NOT NULL,
    email_confirmed_at INTEGER,
    created_at         INTEGER NOT NULL,
    updated_at         INTEGER NOT NULL
  );

  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX sessions_user_id ON sessions(user_id);

  CREATE TABLE verification_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL CHECK (type IN ('signup', 'recovery')),
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE outbox (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    to_email   TEXT NOT NULL,
    subject    TEXT NOT NULL,
    body       TEXT NOT NULL,
    link       TEXT,
    created_at INTEGER NOT NULL
  );
  `,
  // How each session was created: "password" (sign-in / sign-up) or "link"
  // (an emailed confirmation or recovery link). See isRecoverySession().
  `ALTER TABLE sessions ADD COLUMN method TEXT NOT NULL DEFAULT 'password';`,
];

export function migrate(db: DatabaseSync): void {
  const { user_version: current } = db.prepare("PRAGMA user_version").get() as { user_version: number };
  for (let version = current; version < MIGRATIONS.length; version++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[version]!);
      db.exec(`PRAGMA user_version = ${version + 1}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

/** Opens (and migrates) a database. `:memory:` gives a throwaway one for tests. */
export function createDatabase(path: string): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  if (path !== ":memory:") db.exec("PRAGMA journal_mode = WAL;");
  migrate(db);
  return db;
}

// One connection per file for the lifetime of the process (dev server, tests).
const open = new Map<string, DatabaseSync>();

export function openDatabase(path: string): DatabaseSync {
  const key = resolve(path);
  let db = open.get(key);
  if (!db) {
    db = createDatabase(key);
    open.set(key, db);
  }
  return db;
}
