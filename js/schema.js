// GeekOrbit v2 — database schema and the v1 -> v2 migration.
//
// Statuses are stored as stable keys (active, paused, blocked, done, idea).
// Version 1 stored display text with a leading emoji; the migration below
// maps those values to keys. The legacy emoji are written as escapes so the
// source files stay free of emoji.

export const SCHEMA_VERSION = 2;

export const SCHEMA_SQL = `
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE accounts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL DEFAULT '',
  note          TEXT NOT NULL DEFAULT '',
  limited_until TEXT NOT NULL DEFAULT ''
);

CREATE TABLE projects (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'active',
  priority      TEXT NOT NULL DEFAULT 'P1',
  progress      INTEGER NOT NULL DEFAULT 0,
  start_date    TEXT NOT NULL DEFAULT '',
  last_activity TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE project_accounts (
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, account_id)
);

CREATE TABLE chat_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  phase       TEXT NOT NULL DEFAULT '',
  account_id  INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  chat_link   TEXT NOT NULL DEFAULT '',
  summary     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'active',
  start_date  TEXT NOT NULL DEFAULT '',
  last_update TEXT NOT NULL DEFAULT '',
  next_step   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE project_tags (
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

CREATE TABLE changelog (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE INDEX idx_chat_log_account ON chat_log(account_id);
CREATE INDEX idx_chat_log_project ON chat_log(project_id);
`;

// Version 1 status prefixes (green, yellow, red, white, blue circles).
const LEGACY_PREFIX = {
  active: '\u{1F7E2}',
  paused: '\u{1F7E1}',
  blocked: '\u{1F534}',
  done: '\u26AA',
  idea: '\u{1F535}',
};
const LEGACY_SATELLITE = '\u{1F6F0}\uFE0F';

// Version 1 status words, matched when a value has no emoji prefix.
const LEGACY_WORDS = {
  active: ['فعال', 'active'],
  paused: ['معلق', 'متوقف', 'paused'],
  blocked: ['گیر', 'مسدود', 'blocked'],
  done: ['تمام', 'انجام‌شده', 'done'],
  idea: ['ایده', 'idea'],
};

/**
 * Runs inside a transaction opened by the caller. `run(sql, params)` executes one statement.
 * `info.tables` lists the existing tables and `info.columns(table)` a table's columns, so the
 * migration works on any v1 file: it only creates and adds what is missing.
 */
export function migrateV1toV2(run, info) {
  // Tables a v1 file may not have: create them with the v2 definition.
  for (const m of SCHEMA_SQL.matchAll(/CREATE TABLE (\w+) \(([\s\S]*?)\n\);/g)) {
    if (!info.tables.includes(m[1])) run(`CREATE TABLE ${m[1]} (${m[2]}\n)`);
  }
  if (!info.columns('accounts').includes('limited_until')) {
    run(`ALTER TABLE accounts ADD COLUMN limited_until TEXT NOT NULL DEFAULT ''`);
  }

  const keys = Object.keys(LEGACY_PREFIX).map((k) => `'${k}'`).join(',');
  for (const table of ['projects', 'chat_log']) {
    for (const [key, prefix] of Object.entries(LEGACY_PREFIX)) {
      run(`UPDATE ${table} SET status = ? WHERE status LIKE ?`, [key, prefix + '%']);
    }
    for (const [key, words] of Object.entries(LEGACY_WORDS)) {
      for (const w of words) run(`UPDATE ${table} SET status = ? WHERE status NOT IN (${keys}) AND lower(status) LIKE ?`, [key, `%${w}%`]);
    }
    run(`UPDATE ${table} SET status = 'active' WHERE status NOT IN (${keys})`);   // anything left unrecognised
  }

  // Foreign keys were never enforced in v1, so deletes could leave orphans.
  run(`DELETE FROM project_accounts WHERE project_id NOT IN (SELECT id FROM projects) OR account_id NOT IN (SELECT id FROM accounts)`);
  run(`DELETE FROM project_tags WHERE project_id NOT IN (SELECT id FROM projects) OR tag_id NOT IN (SELECT id FROM tags)`);
  run(`UPDATE chat_log SET project_id = NULL WHERE project_id IS NOT NULL AND project_id NOT IN (SELECT id FROM projects)`);
  run(`UPDATE chat_log SET account_id = NULL WHERE account_id IS NOT NULL AND account_id NOT IN (SELECT id FROM accounts)`);

  run(`UPDATE changelog SET description = trim(replace(description, ?, ''))`, [LEGACY_SATELLITE]);
  run(`CREATE INDEX IF NOT EXISTS idx_chat_log_account ON chat_log(account_id)`);
  run(`CREATE INDEX IF NOT EXISTS idx_chat_log_project ON chat_log(project_id)`);
  run(`INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '2')`);
}
