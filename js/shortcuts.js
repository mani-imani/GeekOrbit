// GeekOrbit — keyboard shortcuts. They use event.code, so they work on the Persian layout too.

import { ROUTES } from './model.js';
import { isDialogOpen, openDialog, icon } from './ui.js';
import { chatDialog, projectDialog } from './dialogs.js';
import { isReady } from './db.js';

const LIST = [
  { keys: ['N'], text: 'چت تازه' },
  { keys: ['P'], text: 'پروژه‌ی تازه' },
  { keys: ['/'], text: 'رفتن به جست‌وجو' },
  { keys: ['۱', '…', '۶'], text: 'رفتن به بخش‌ها به ترتیب منو' },
  { keys: ['?'], text: 'نمایش همین فهرست' },
  { keys: ['Esc'], text: 'بستن پنجره' },
];

export function openShortcutsDialog() {
  openDialog({
    title: 'میانبرهای صفحه‌کلید',
    body: `<dl class="go-shortcuts">${LIST.map((s) => `
      <dt>${s.keys.map((k) => `<kbd>${k}</kbd>`).join('')}</dt><dd>${s.text}</dd>`).join('')}</dl>
      <p class="go-hint">میانبرها وقتی در یک فیلد می‌نویسید کار نمی‌کنند.</p>`,
    footer: '<button type="button" class="gm-btn gm-btn--secondary" data-dismiss>بستن</button>',
  });
}

export function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (!isReady() || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const t = e.target;
    if (t.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (isDialogOpen()) return;

    if (e.code === 'Slash' && e.shiftKey) { e.preventDefault(); openShortcutsDialog(); return; }
    if (e.shiftKey) return;
    if (e.code === 'KeyN') { e.preventDefault(); chatDialog(); return; }
    if (e.code === 'KeyP') { e.preventDefault(); projectDialog(); return; }
    if (e.code === 'Slash') {
      const q = document.getElementById('flt-q');
      if (q) { e.preventDefault(); q.focus(); }
      return;
    }
    const m = /^Digit([1-9])$/.exec(e.code);
    if (m && ROUTES[Number(m[1]) - 1]) { e.preventDefault(); location.hash = `#/${ROUTES[Number(m[1]) - 1].id}`; }
  });
}
