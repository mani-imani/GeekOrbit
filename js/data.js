// GeekOrbit — reads and writes for the six tables. Views never write SQL themselves.

import { all, one, run, tx } from './db.js';
import { daysSince, normalizeUrl } from './util.js';
import { STALE_DAYS } from './model.js';

// ---- reads -------------------------------------------------------------------

export const getAccounts = () => all(`
  SELECT a.*,
    (SELECT COUNT(*) FROM chat_log c WHERE c.account_id = a.id) AS chat_count,
    (SELECT COUNT(*) FROM chat_log c WHERE c.account_id = a.id AND c.status != 'done') AS open_count,
    (SELECT COUNT(*) FROM project_accounts pa WHERE pa.account_id = a.id) AS project_count
  FROM accounts a ORDER BY a.id`);

export const getTags = () => all(`
  SELECT t.*, (SELECT COUNT(*) FROM project_tags pt WHERE pt.tag_id = t.id) AS project_count
  FROM tags t ORDER BY t.name`);

export function getProjects() {
  const projects = all(`
    SELECT p.*, (SELECT COUNT(*) FROM chat_log c WHERE c.project_id = p.id) AS chat_count
    FROM projects p ORDER BY p.code`);
  const accs = all('SELECT * FROM project_accounts');
  const tags = all('SELECT pt.project_id, t.id, t.name FROM project_tags pt JOIN tags t ON t.id = pt.tag_id ORDER BY t.name');
  for (const p of projects) {
    p.account_ids = accs.filter((x) => x.project_id === p.id).map((x) => x.account_id);
    p.tags = tags.filter((x) => x.project_id === p.id).map((x) => ({ id: x.id, name: x.name }));
  }
  return projects;
}

export const getProject = (id) => getProjects().find((p) => p.id === id) || null;

export function getChats() {
  const chats = all(`
    SELECT c.*, p.code AS project_code, p.name AS project_name, a.name AS account_name
    FROM chat_log c
    LEFT JOIN projects p ON p.id = c.project_id
    LEFT JOIN accounts a ON a.id = c.account_id
    ORDER BY c.last_update DESC, c.id DESC`);
  for (const c of chats) c.stale = isStale(c);
  return chats;
}

export const getChat = (id) => getChats().find((c) => c.id === id) || null;

export const getChangelog = () => all('SELECT * FROM changelog ORDER BY date DESC, id DESC');

/** An open chat (active or blocked) nobody touched for STALE_DAYS days. */
export function isStale(chat) {
  if (chat.status !== 'active' && chat.status !== 'blocked') return false;
  const n = daysSince(chat.last_update || chat.start_date);
  return n !== null && n >= STALE_DAYS;
}

export function staleDays(chat) {
  return daysSince(chat.last_update || chat.start_date) ?? 0;
}

/** Another chat with the same (normalised) link, if one exists. */
export function findDuplicateLink(link, exceptId = null) {
  const key = normalizeUrl(link);
  if (!key) return null;
  return all('SELECT c.id, c.chat_link, c.summary, p.code AS project_code FROM chat_log c LEFT JOIN projects p ON p.id = c.project_id WHERE c.chat_link != \'\'')
    .find((c) => c.id !== exceptId && normalizeUrl(c.chat_link) === key) || null;
}

export function nextProjectCode() {
  const codes = all('SELECT code FROM projects').map((r) => r.code);
  let max = 0;
  for (const c of codes) {
    const m = /(\d+)\s*$/.exec(c);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `P${String(max + 1).padStart(2, '0')}`;
}

// ---- writes -------------------------------------------------------------------

export function saveProject(data, id = null) {
  return tx(() => {
    const row = [data.code, data.name, data.description, data.status, data.priority,
      data.progress, data.start_date, data.last_activity];
    let pid = id;
    if (id) {
      run(`UPDATE projects SET code=?, name=?, description=?, status=?, priority=?, progress=?, start_date=?, last_activity=? WHERE id=?`, [...row, id]);
    } else {
      pid = run(`INSERT INTO projects (code, name, description, status, priority, progress, start_date, last_activity) VALUES (?,?,?,?,?,?,?,?)`, row);
    }
    run('DELETE FROM project_accounts WHERE project_id = ?', [pid]);
    run('DELETE FROM project_tags WHERE project_id = ?', [pid]);
    for (const a of data.account_ids) run('INSERT INTO project_accounts (project_id, account_id) VALUES (?,?)', [pid, a]);
    for (const t of data.tag_ids) run('INSERT INTO project_tags (project_id, tag_id) VALUES (?,?)', [pid, t]);
    return pid;
  });
}

// Deletes clear their links explicitly: a file migrated from v1 may have tables without
// REFERENCES clauses, so ON DELETE CASCADE / SET NULL cannot be relied on there.
export const deleteProject = (id) => tx(() => {
  run('DELETE FROM project_accounts WHERE project_id = ?', [id]);
  run('DELETE FROM project_tags WHERE project_id = ?', [id]);
  run('UPDATE chat_log SET project_id = NULL WHERE project_id = ?', [id]);
  run('DELETE FROM projects WHERE id = ?', [id]);
});

export function saveChat(data, id = null) {
  const row = [data.project_id, data.phase, data.account_id, data.chat_link, data.summary,
    data.status, data.start_date, data.last_update, data.next_step];
  if (id) {
    return run(`UPDATE chat_log SET project_id=?, phase=?, account_id=?, chat_link=?, summary=?, status=?, start_date=?, last_update=?, next_step=? WHERE id=?`, [...row, id]);
  }
  return run(`INSERT INTO chat_log (project_id, phase, account_id, chat_link, summary, status, start_date, last_update, next_step) VALUES (?,?,?,?,?,?,?,?,?)`, row);
}

export const deleteChat = (id) => run('DELETE FROM chat_log WHERE id = ?', [id]);

export function saveAccount(data, id = null) {
  if (id) return run('UPDATE accounts SET name=?, role=?, note=?, limited_until=? WHERE id=?', [data.name, data.role, data.note, data.limited_until, id]);
  return run('INSERT INTO accounts (name, role, note, limited_until) VALUES (?,?,?,?)', [data.name, data.role, data.note, data.limited_until]);
}

export const deleteAccount = (id) => tx(() => {
  run('DELETE FROM project_accounts WHERE account_id = ?', [id]);
  run('UPDATE chat_log SET account_id = NULL WHERE account_id = ?', [id]);
  run('DELETE FROM accounts WHERE id = ?', [id]);
});

export const saveTag = (name, id = null) =>
  (id ? run('UPDATE tags SET name = ? WHERE id = ?', [name, id]) : run('INSERT INTO tags (name) VALUES (?)', [name]));
export const deleteTag = (id) => tx(() => {
  run('DELETE FROM project_tags WHERE tag_id = ?', [id]);
  run('DELETE FROM tags WHERE id = ?', [id]);
});
export const tagByName = (name) => one('SELECT * FROM tags WHERE name = ?', [name]);

export const addEvent = (date, description) => run('INSERT INTO changelog (date, description) VALUES (?, ?)', [date, description]);
export const deleteEvent = (id) => run('DELETE FROM changelog WHERE id = ?', [id]);
