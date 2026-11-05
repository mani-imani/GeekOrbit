// GeekOrbit v2 — entry point: gate (create / open), migration, routing, theme, file status.

import * as db from './db.js';
import { VERSION, ROUTES } from './model.js';
import { icon, iconButton, toast, openDialog } from './ui.js';
import { parseHash } from './router.js';
import { openBackupDialog } from './backup.js';
import { initShortcuts, openShortcutsDialog } from './shortcuts.js';
import * as dashboard from './views/dashboard.js';
import * as projects from './views/projects.js';
import * as chats from './views/chats.js';
import * as accounts from './views/accounts.js';
import * as tags from './views/tags.js';
import * as changelog from './views/changelog.js';

const VIEWS = { dashboard, projects, chats, accounts, tags, changelog };
const $ = (id) => document.getElementById(id);
const app = $('app');

// ---- theme ----------------------------------------------------------------------

function applyTheme(choice) {
  const root = document.documentElement;
  if (choice === 'light' || choice === 'dark') root.setAttribute('data-theme', choice);
  else root.removeAttribute('data-theme');
  document.querySelectorAll('[data-theme-choice]').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.themeChoice === choice)));
}
function initTheme() {
  let saved = 'system';
  try { saved = localStorage.getItem('geekorbit-theme') || 'system'; } catch { /* storage may be blocked */ }
  applyTheme(saved);
  $('themeSwitch').addEventListener('click', (e) => {
    const choice = e.target.closest('[data-theme-choice]')?.dataset.themeChoice;
    if (!choice) return;
    applyTheme(choice);
    try { localStorage.setItem('geekorbit-theme', choice); } catch { /* ignore */ }
  });
}

// ---- file status in the footer -----------------------------------------------------

function showStatus(state) {
  const el = $('dbStatus');
  el.hidden = false;
  el.classList.remove('is-error', 'is-manual');
  if (state === 'saving') el.textContent = 'در حال ذخیره…';
  else if (state === 'saved') el.textContent = 'ذخیره شد';
  else if (state === 'error') { el.textContent = 'ذخیره در فایل انجام نشد'; el.classList.add('is-error'); }
  else if (state === 'demo') { el.classList.add('is-manual'); el.textContent = 'حالت نمونه؛ چیزی ذخیره نمی‌شود'; }
  else {
    el.classList.add('is-manual');
    el.textContent = db.hasUnsavedChanges() ? 'ذخیره‌نشده، نسخه‌ی SQLite را دانلود کنید' : 'بدون فایل';
  }
}

// ---- routing -----------------------------------------------------------------------

let started = false;

function route(moveFocus = false) {
  if (!started) return;
  const { name, params } = parseHash();
  const id = VIEWS[name] ? name : 'dashboard';
  VIEWS[id].render(app, params);
  const info = ROUTES.find((r) => r.id === id);
  document.title = `${info.label} · GeekOrbit`;
  $('nav').querySelectorAll('a').forEach((a) =>
    (a.dataset.route === id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  // on phones the menu scrolls sideways: keep the current section in view
  // (scrolls only the menu itself, never the page)
  const nav = $('nav'); const cur = nav.querySelector('[aria-current]');
  if (cur && nav.scrollWidth > nav.clientWidth) {
    const r = cur.getBoundingClientRect(); const n = nav.getBoundingClientRect();
    if (r.left < n.left) nav.scrollLeft -= n.left - r.left + 24;
    else if (r.right > n.right) nav.scrollLeft += r.right - n.right + 24;
  }
  if (moveFocus) app.querySelector('.go-view')?.focus({ preventScroll: true });
}

function buildChrome() {
  $('nav').innerHTML = ROUTES.map((r) =>
    `<a href="#/${r.id}" data-route="${r.id}">${icon(r.icon)}<span>${r.label}</span></a>`).join('');
  $('headerTools').innerHTML =
    iconButton({ icon: 'database-down', label: 'پشتیبان و خروجی', attrs: 'data-tool="backup"' }) +
    iconButton({ icon: 'keyboard', label: 'میانبرهای صفحه‌کلید', attrs: 'data-tool="keys"' });
  $('headerTools').addEventListener('click', (e) => {
    const tool = e.target.closest('[data-tool]')?.dataset.tool;
    if (tool === 'backup') openBackupDialog();
    if (tool === 'keys') openShortcutsDialog();
  });
}

let rerenderQueued = false;
db.onChange(() => {
  if (rerenderQueued) return;
  rerenderQueued = true;
  queueMicrotask(() => { rerenderQueued = false; route(false); });
});
db.onStatus(showStatus);
window.addEventListener('hashchange', () => route(true));
window.addEventListener('beforeunload', (e) => {
  if (db.isReady() && db.hasUnsavedChanges()) { e.preventDefault(); e.returnValue = ''; }
});

// ---- gate ----------------------------------------------------------------------------

const ERRORS = {
  NOT_GEEKORBIT: 'این فایل پایگاه داده‌ی <bdi>GeekOrbit</bdi> نیست.',
  TOO_NEW: 'این فایل با نسخه‌ی جدیدتری ساخته شده و اینجا باز نمی‌شود.',
};

function showGate(message = '') {
  started = false;
  $('header').hidden = true;
  const fsa = db.supportsFileSystemAccess();
  app.innerHTML = `
    <section class="go-gate">
      <div class="gm-card go-gate__card">
        <img class="go-gate__icon" src="assets/icons/geekorbit-icon.svg" alt="" width="72" height="72">
        <img class="go-gate__word go-wm-light" src="assets/logo/geekorbit-wordmark-light.svg" alt="GeekOrbit">
        <img class="go-gate__word go-wm-dark" src="assets/logo/geekorbit-wordmark-dark.svg" alt="GeekOrbit">
        <p>اگر چند حساب چت‌بات هوش مصنوعی دارید، <bdi>GeekOrbit</bdi> نشان می‌دهد هر پروژه و هر گفت‌وگو روی کدام حساب است، کدام چت‌ها باز مانده‌اند و از کجا باید ادامه داد.</p>
        <ul class="go-gate__points">
          <li>${icon('folder2')}<span>حساب‌ها، پروژه‌ها و چت‌ها در یک نگاه</span></li>
          <li>${icon('clipboard-check')}<span>یادداشت تحویل برای ادامه در یک گفت‌وگوی تازه</span></li>
          <li>${icon('database-down')}<span>همه‌چیز در یک فایل <bdi>SQLite</bdi> روی دستگاه خودتان؛ هیچ داده‌ای به جایی فرستاده نمی‌شود</span></li>
        </ul>
        ${message ? `<p class="go-form-error" role="alert">${message}</p>` : ''}
        <div class="go-gate__actions">
          <button type="button" class="gm-btn gm-btn--primary" data-gate="new">${icon('plus-lg')} ساخت پایگاه داده‌ی تازه</button>
          <button type="button" class="gm-btn gm-btn--secondary" data-gate="open">${icon('folder2')} باز کردن فایل موجود</button>
          <input type="file" id="gateFile" accept=".sqlite,.db" hidden>
          <button type="button" class="go-gate__demo" data-gate="demo">${icon('speedometer2')} اول با داده‌ی نمونه امتحان کنید</button>
        </div>
        <p class="go-gate__note">${fsa ? 'تغییرها خودکار در همان فایل ذخیره می‌شوند.' : 'این مرورگر نوشتن در فایل را پشتیبانی نمی‌کند. تغییرها را با دانلود نسخه‌ی SQLite نگه دارید. برای ذخیره‌ی خودکار، Chrome یا Edge را باز کنید.'}</p>
      </div>
    </section>`;
  const fileInput = $('gateFile');
  app.querySelector('[data-gate="new"]').addEventListener('click', () => guard(() => db.createNew()));
  app.querySelector('[data-gate="demo"]').addEventListener('click', () => guard(() => db.createDemo()));
  app.querySelector('[data-gate="open"]').addEventListener('click', () => {
    if (fsa) guard(() => db.openWithPicker());
    else fileInput.click();
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) guard(() => db.openFromFile(file));
  });
}

async function guard(action) {
  try {
    await action();
    await afterLoad();
  } catch (err) {
    if (err?.name === 'AbortError') return;        // the person closed the picker
    console.error(err);
    showGate(ERRORS[err?.code] || 'باز کردن فایل انجام نشد. دوباره تلاش کنید.');
  }
}

function migrationDialog() {
  return new Promise((resolve) => {
    let go = false;
    openDialog({
      title: 'به‌روزرسانی فایل',
      body: `<p class="go-confirm">این فایل با نسخه‌ی قدیمی <bdi>GeekOrbit</bdi> ساخته شده. برای کار با نسخه‌ی ۲ ساختارش یک بار به‌روز می‌شود.</p>
        <p class="go-confirm">پیش از شروع یک نسخه‌ی پشتیبان از وضعیت فعلی بگیرید.</p>
        <button type="button" class="gm-btn gm-btn--secondary" data-backup-old>${icon('database-down')} دانلود پشتیبان</button>`,
      footer: `<button type="submit" class="gm-btn gm-btn--primary">به‌روزرسانی</button>
        <button type="button" class="gm-btn gm-btn--secondary" data-dismiss>انصراف</button>`,
      onOpen: ({ el }) => el.querySelector('[data-backup-old]').addEventListener('click', () => {
        db.download('GeekOrbit-before-v2.sqlite', new Blob([db.exportBytes()], { type: 'application/x-sqlite3' }));
      }),
      onSubmit: () => { go = true; },
      onClose: () => resolve(go),
    });
  });
}

async function afterLoad() {
  if (db.needsMigration()) {
    $('header').hidden = true;
    if (!(await migrationDialog())) { db.close(); showGate(); return; }
    await db.migrate();
    toast('فایل به نسخه‌ی ۲ به‌روز شد.');
  }
  started = true;
  $('header').hidden = false;
  showStatus(db.isDemo() ? 'demo' : (db.hasFileHandle() ? 'saved' : 'manual'));
  if (db.isDemo()) toast('حالت نمونه: هر چه می‌خواهید امتحان کنید؛ با بستن صفحه همه‌چیز پاک می‌شود.');
  if (!location.hash || location.hash === '#') location.hash = '#/dashboard';
  route(true);
}

// ---- start ---------------------------------------------------------------------------

$('version').textContent = VERSION;
initTheme();
buildChrome();
initShortcuts();
showGate();
