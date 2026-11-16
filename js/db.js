// GeekOrbit v2 — database layer.
// sql.js (SQLite compiled to WebAssembly) plus a real .sqlite file on disk via
// the File System Access API (Chrome and Edge). Other browsers use a manual
// download flow.

import { SCHEMA_SQL, SCHEMA_VERSION, migrateV1toV2 } from './schema.js';
import { fillDemo } from './demo.js';
import { todayISO } from './util.js';

let SQL = null;
let db = null;
let fileHandle = null;
let saveTimer = null;
let txDepth = 0;
let pending = false;   // a write to the file is queued or running
let dirty = false;     // manual mode: changes not yet downloaded
let demo = false;      // sample data in memory only: nothing to save, nothing to warn about

const changeListeners = new Set();
const statusListeners = new Set();

export const supportsFileSystemAccess = () =>
  typeof window.showSaveFilePicker === 'function' && typeof window.showOpenFilePicker === 'function';

export const onChange = (fn) => { changeListeners.add(fn); return () => changeListeners.delete(fn); };
export const onStatus = (fn) => { statusListeners.add(fn); return () => statusListeners.delete(fn); };

function emitStatus(state) { statusListeners.forEach((fn) => fn(state)); }
function emitChange() { changeListeners.forEach((fn) => fn()); }

// The SQLite engine (sql.js, WebAssembly).
// It is loaded when the page opens, not at the first tap, and the page reads the .wasm file itself and hands
// the bytes to sql.js. Reason (v2.2.2): in the app installed on an iPhone, leaving the download to sql.js at
// tap time could wait forever on the service worker, so "new database" and "sample data" did nothing.
// Four ways to get the file, tried in order, each with a time limit (v2.2.3: on an installed iPhone app the
// plain download failed outright, "both async and sync fetching of the wasm failed"):
//   1. the offline cache, read directly   2. a normal download   3. a download that skips the service worker
//   4. the copy shipped as text inside vendor/sql-wasm-embedded.js, which travels like the app's own scripts.
// If all four fail, the person sees an error with the reasons instead of a button that does nothing.
const WASM_URL = 'vendor/sql-wasm.wasm';
let enginePromise = null;

const within = (promise, ms, what) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${what}: no answer after ${ms / 1000}s`)), ms)),
]);

const isWasm = (bytes) => bytes.length > 1000 && bytes[0] === 0 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d;   // "\0asm"

async function fetchBytes(url, label, ms) {
  const res = await within(fetch(url), ms, label);
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
  return new Uint8Array(await within(res.arrayBuffer(), ms, `${label} read`));
}

const WASM_SOURCES = [
  ['cache', async () => {
    if (!('caches' in window)) throw new Error('no cache');
    const hit = await within(caches.match(WASM_URL, { ignoreSearch: true }), 4000, 'cache');
    if (!hit || !hit.ok) throw new Error('not cached');
    return new Uint8Array(await within(hit.arrayBuffer(), 8000, 'cache read'));
  }],
  ['download', () => fetchBytes(WASM_URL, 'download', 12000)],
  ['direct', () => fetchBytes(`${WASM_URL}?direct=1`, 'direct', 12000)],   // sw.js leaves "?direct" requests alone
  ['embedded', async () => {
    const text = (await within(import('../vendor/sql-wasm-embedded.js'), 30000, 'embedded')).default;
    const raw = atob(text);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }],
];

async function wasmBytes() {
  const problems = [];
  for (const [name, get] of WASM_SOURCES) {
    try {
      const bytes = await get();
      if (isWasm(bytes)) return bytes;
      problems.push(`${name}: not a wasm file`);
    } catch (err) { problems.push(`${name}: ${String(err?.message || err).slice(0, 40)}`); }
  }
  throw new Error(`engine file: ${problems.join(' | ')}`);
}

async function loadEngine() {
  if (typeof window.initSqlJs !== 'function') throw new Error('sql-wasm.js did not load');
  const wasmBinary = await wasmBytes();
  return within(window.initSqlJs({ wasmBinary, locateFile: (f) => `vendor/${f}` }), 20000, 'engine start');
}

async function ensureEngine() {
  if (SQL) return SQL;
  if (!enginePromise) enginePromise = loadEngine();
  try { SQL = await enginePromise; } catch (err) { enginePromise = null; throw err; }   // a later tap tries again
  return SQL;
}

/** Start loading the engine now (called when the page opens). Errors wait for the first real use. */
export function warmUp() { ensureEngine().catch(() => {}); }

function open(bytes) {
  db = bytes ? new SQL.Database(bytes) : new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
}

// ---- lifecycle ---------------------------------------------------------

export async function createNew() {
  await ensureEngine();
  let handle = null;
  if (supportsFileSystemAccess()) {
    handle = await window.showSaveFilePicker({
      suggestedName: 'GeekOrbit.sqlite',
      types: [{ description: 'GeekOrbit', accept: { 'application/x-sqlite3': ['.sqlite'] } }],
    });
  }
  open(null);
  demo = false;
  db.run(SCHEMA_SQL);
  db.run(`INSERT INTO meta (key, value) VALUES ('schema_version', ?)`, [String(SCHEMA_VERSION)]);
  db.run(`INSERT INTO meta (key, value) VALUES ('created_at', ?)`, [todayISO()]);
  db.run(`INSERT INTO changelog (date, description) VALUES (?, ?)`, [todayISO(), 'پایگاه داده ساخته شد.']);
  fileHandle = handle;
  if (fileHandle) await writeNow();
  else { dirty = true; emitStatus('manual'); }
}

/** Sample data in memory, for trying the app. Never saved; the tab is the whole session. */
export async function createDemo() {
  await ensureEngine();
  open(null);
  db.run(SCHEMA_SQL);
  db.run(`INSERT INTO meta (key, value) VALUES ('schema_version', ?)`, [String(SCHEMA_VERSION)]);
  db.run(`INSERT INTO meta (key, value) VALUES ('last_backup', ?)`, [todayISO()]);
  db.run('BEGIN');
  fillDemo((sql, params) => db.run(sql, params));
  db.run('COMMIT');
  fileHandle = null; dirty = false; demo = true;
  emitStatus('demo');
}

export const isDemo = () => demo;

export async function openWithPicker() {
  await ensureEngine();
  const [handle] = await window.showOpenFilePicker({
    types: [{ description: 'GeekOrbit', accept: { 'application/x-sqlite3': ['.sqlite', '.db'] } }],
  });
  let writable = false;
  try { writable = (await handle.requestPermission({ mode: 'readwrite' })) === 'granted'; } catch { writable = false; }
  const file = await handle.getFile();
  loadBytes(new Uint8Array(await file.arrayBuffer()));
  fileHandle = writable ? handle : null;
  emitStatus(fileHandle ? 'saved' : 'manual');
  return { writable };
}

export async function openFromFile(file) {
  await ensureEngine();
  loadBytes(new Uint8Array(await file.arrayBuffer()));
  fileHandle = null;
  dirty = false;
  emitStatus('manual');
}

const tableNames = () => all(`SELECT name FROM sqlite_master WHERE type = 'table'`).map((r) => r.name);

function loadBytes(bytes) {
  demo = false;
  open(bytes);
  try {
    const tables = tableNames();
    const hasVersion = tables.includes('meta') && one(`SELECT value FROM meta WHERE key = 'schema_version'`);
    // A v1 file without a version row still has the three core tables.
    const looksV1 = ['accounts', 'projects', 'chat_log'].every((t) => tables.includes(t));
    if (!hasVersion && !looksV1) throw new Error('not geekorbit');
  } catch {
    db = null;
    const err = new Error('NOT_GEEKORBIT');
    err.code = 'NOT_GEEKORBIT';
    throw err;
  }
  if (schemaVersion() > SCHEMA_VERSION) {
    db = null;
    const err = new Error('TOO_NEW');
    err.code = 'TOO_NEW';
    throw err;
  }
}

export function close() {
  clearTimeout(saveTimer);
  if (db) db.close();
  db = null; fileHandle = null; pending = false; dirty = false; txDepth = 0; demo = false;
}

export const isReady = () => !!db;
export const hasFileHandle = () => !!fileHandle;
export const hasUnsavedChanges = () => !demo && (pending || dirty);
export function schemaVersion() {
  if (!tableNames().includes('meta')) return 1;
  return Number(one(`SELECT value FROM meta WHERE key = 'schema_version'`)?.value || 1);
}
export const needsMigration = () => isReady() && schemaVersion() < SCHEMA_VERSION;

export async function migrate() {
  const columns = (table) => all(`PRAGMA table_info(${table})`).map((c) => c.name);
  tx(() => migrateV1toV2((sql, params) => db.run(sql, params), { tables: tableNames(), columns }));
  if (fileHandle) await writeNow();
}

// ---- persistence ---------------------------------------------------------

async function writeNow() {
  clearTimeout(saveTimer);
  if (!db || !fileHandle) return;
  pending = true;
  emitStatus('saving');
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(db.export());
    await writable.close();
    pending = false;
    emitStatus('saved');
  } catch (err) {
    console.error('GeekOrbit: could not write the file', err);
    emitStatus('error');
  }
}

function afterChange() {
  if (fileHandle) {
    pending = true;
    emitStatus('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(writeNow, 350);
  } else if (demo) {
    emitStatus('demo');
  } else {
    dirty = true;
    emitStatus('manual');
  }
  emitChange();
}

export function exportBytes() { return db.export(); }

export function markBackedUp() {
  setMeta('last_backup', todayISO());
}

export function downloadCopy() {
  markBackedUp();                      // first, so the copy carries the date
  const blob = new Blob([exportBytes()], { type: 'application/x-sqlite3' });
  download('GeekOrbit.sqlite', blob);
  dirty = false;
  emitStatus(fileHandle ? 'saved' : 'manual');
}

export function download(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ---- queries ---------------------------------------------------------------

export function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export function one(sql, params = []) {
  const rows = all(sql, params);
  return rows.length ? rows[0] : null;
}

export function run(sql, params = []) {
  db.run(sql, params);
  const id = db.exec('SELECT last_insert_rowid()')[0]?.values?.[0]?.[0];
  if (txDepth === 0) afterChange();
  return id;
}

/** Group several statements into one transaction, one save and one UI refresh. */
export function tx(fn) {
  txDepth += 1;
  if (txDepth === 1) db.run('BEGIN');
  try {
    const result = fn();
    if (txDepth === 1) db.run('COMMIT');
    return result;
  } catch (err) {
    if (txDepth === 1) db.run('ROLLBACK');
    throw err;
  } finally {
    txDepth -= 1;
    if (txDepth === 0) afterChange();
  }
}

export const meta = (key) => one('SELECT value FROM meta WHERE key = ?', [key])?.value ?? null;
export const setMeta = (key, value) => run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [key, String(value)]);
