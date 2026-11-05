// GeekOrbit — backup dialog, exports (SQLite, JSON, CSV) and the reminder rule.

import * as db from './db.js';
import { meta } from './db.js';
import { getAccounts, getProjects, getChats, getTags, getChangelog } from './data.js';
import { statusLabel, priorityLabel, BACKUP_DAYS } from './model.js';
import { daysSince, todayISO, fa, fmtDate } from './util.js';
import { openDialog, icon, toast } from './ui.js';

/** { due, never, days } — drives the dashboard notice. */
export function backupState() {
  const last = meta('last_backup');
  if (!last) return { due: true, never: true, days: null };
  const days = daysSince(last);
  return { due: days !== null && days >= BACKUP_DAYS, never: false, days };
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const toCSV = (header, rows) => `﻿${[header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;

function blob(text, type) { return new Blob([text], { type: `${type};charset=utf-8` }); }

export function exportJSON() {
  const data = {
    app: 'GeekOrbit',
    schema_version: db.schemaVersion(),
    exported_at: todayISO(),
    accounts: getAccounts().map(({ chat_count, open_count, project_count, ...a }) => a),
    projects: getProjects(),
    chats: getChats().map(({ stale, ...c }) => c),
    tags: getTags().map(({ project_count, ...t }) => t),
    changelog: getChangelog(),
  };
  db.download(`GeekOrbit-${todayISO()}.json`, blob(JSON.stringify(data, null, 2), 'application/json'));
}

export function exportProjectsCSV() {
  const accounts = new Map(getAccounts().map((a) => [a.id, a.name]));
  const rows = getProjects().map((p) => [
    p.code, p.name, statusLabel(p.status), priorityLabel(p.priority), p.progress,
    p.account_ids.map((i) => accounts.get(i)).filter(Boolean).join(' | '),
    p.tags.map((t) => t.name).join(' | '), p.start_date, p.last_activity, p.description,
  ]);
  db.download(`GeekOrbit-projects-${todayISO()}.csv`, blob(toCSV(
    ['کد', 'نام', 'وضعیت', 'اولویت', 'پیشرفت', 'حساب‌ها', 'برچسب‌ها', 'شروع', 'آخرین فعالیت', 'توضیح'], rows), 'text/csv'));
}

export function exportChatsCSV() {
  const rows = getChats().map((c) => [
    c.project_code || '', c.phase, c.account_name || '', statusLabel(c.status),
    c.chat_link, c.summary, c.next_step, c.start_date, c.last_update,
  ]);
  db.download(`GeekOrbit-chats-${todayISO()}.csv`, blob(toCSV(
    ['پروژه', 'مرحله', 'حساب', 'وضعیت', 'پیوند', 'خلاصه', 'گام بعدی', 'شروع', 'به‌روزرسانی'], rows), 'text/csv'));
}

export function openBackupDialog() {
  const last = meta('last_backup');
  const file = db.hasFileHandle();
  openDialog({
    title: 'پشتیبان و خروجی',
    body: `
      <p class="go-confirm">${file
        ? 'تغییرها خودکار در فایل SQLite ذخیره می‌شوند. پشتیبان یعنی یک نسخه‌ی جدا، جایی امن‌تر.'
        : 'این نشست به فایلی وصل نیست. برای نگه‌داشتن تغییرها باید یک نسخه‌ی SQLite دانلود کنید.'}</p>
      <p class="go-hint go-hint--block">آخرین پشتیبان: ${last ? fmtDate(last) : 'هنوز گرفته نشده'}</p>
      <div class="go-exports">
        <button type="button" class="gm-btn gm-btn--primary" data-act="sqlite">${icon('database-down')} نسخه‌ی SQLite <small>برای بازیابی کامل</small></button>
        <button type="button" class="gm-btn gm-btn--secondary" data-act="json">${icon('filetype-json')} خروجی JSON <small>همه‌ی جدول‌ها</small></button>
        <button type="button" class="gm-btn gm-btn--secondary" data-act="csv-projects">${icon('filetype-csv')} پروژه‌ها (CSV) <small>برای صفحه‌گسترده</small></button>
        <button type="button" class="gm-btn gm-btn--secondary" data-act="csv-chats">${icon('filetype-csv')} چت‌ها (CSV) <small>برای صفحه‌گسترده</small></button>
      </div>`,
    footer: '<button type="button" class="gm-btn gm-btn--secondary" data-dismiss>بستن</button>',
    onOpen: ({ el }) => {
      el.querySelector('.go-exports').addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (!act) return;
        if (act === 'sqlite') { db.downloadCopy(); toast('نسخه‌ی SQLite دانلود شد.'); }
        if (act === 'json') { exportJSON(); toast('خروجی JSON دانلود شد.'); }
        if (act === 'csv-projects') { exportProjectsCSV(); toast('فایل CSV پروژه‌ها دانلود شد.'); }
        if (act === 'csv-chats') { exportChatsCSV(); toast('فایل CSV چت‌ها دانلود شد.'); }
      });
    },
  });
}

export const backupAgeText = (state) => (state.never ? 'هنوز پشتیبان نگرفته‌اید.' : `آخرین پشتیبان ${fa(state.days)} روز پیش بوده است.`);
