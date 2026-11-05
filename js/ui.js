// GeekOrbit — UI building blocks: icons, dialogs, toast, status and account marks.

import { ICONS } from './icons.js';
import { esc, u, fa } from './util.js';
import { statusLabel } from './model.js';

export function icon(name, size = 16) {
  const inner = ICONS[name];
  if (!inner) { console.warn(`GeekOrbit: missing icon "${name}"`); return ''; }
  return `<svg class="go-icon" width="${size}" height="${size}" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">${inner}</svg>`;
}

/** Icon-only button. A label is required for screen readers. */
export function iconButton({ icon: name, label, attrs = '', cls = '' }) {
  return `<button type="button" class="go-iconbtn ${cls}" aria-label="${esc(label)}" title="${esc(label)}" ${attrs}>${icon(name)}</button>`;
}

export function statusHtml(key) {
  const mark = key === 'done' ? icon('check2', 13) : '';
  return `<span class="gm-status go-status go-status--${esc(key)}">${mark}${esc(statusLabel(key))}</span>`;
}

/** Accounts are told apart by number, never by a hue of their own. */
export function accountMark(ordinal) {
  const n = Math.min(ordinal || 0, 9);
  return `<span class="go-acc" data-n="${n}" aria-hidden="true">${fa(ordinal || 0)}</span>`;
}

export function accountOrdinals(accounts) {
  const map = new Map();
  [...accounts].sort((a, b) => a.id - b.id).forEach((a, i) => map.set(a.id, i + 1));
  return map;
}

export function accountLabel(account, ordinals) {
  if (!account) return '<span class="gm-muted">—</span>';
  return `<span class="go-acctag">${accountMark(ordinals.get(account.id))}${u(account.name)}</span>`;
}

export const tagHtml = (name) => `<span class="go-tag" dir="auto">${esc(name)}</span>`;

// ---- toast ----------------------------------------------------------------

let toastTimer;
export function toast(message, { danger = false } = {}) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('go-toast--danger', danger);
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3200);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.insetInlineStart = '-9999px';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
    return ok;
  }
}

// ---- dialogs ----------------------------------------------------------------

let dialogCounter = 0;

/**
 * Native <dialog> (focus trap, Escape and inert background come from the browser).
 * onSubmit(form, ctx) may return false to keep the dialog open.
 */
export function openDialog({ title, body, footer = '', wide = false, onOpen, onSubmit, onClose }) {
  const id = `dlg${++dialogCounter}`;
  const el = document.createElement('dialog');
  el.className = `go-dialog${wide ? ' go-dialog--wide' : ''}`;
  el.setAttribute('aria-labelledby', `${id}-title`);
  el.innerHTML = `
    <form class="go-dialog__form" novalidate>
      <header class="go-dialog__head">
        <h2 id="${id}-title">${esc(title)}</h2>
        ${iconButton({ icon: 'x-lg', label: 'بستن', attrs: 'data-close' })}
      </header>
      <div class="go-dialog__body">${body}</div>
      <footer class="go-dialog__foot">${footer}</footer>
    </form>`;
  document.getElementById('dialogRoot').appendChild(el);

  const form = el.querySelector('form');
  const ctx = {
    el, form,
    close: (value) => el.close(value),
    setError(message) {
      let box = el.querySelector('.go-form-error');
      if (!box) {
        box = document.createElement('p');
        box.className = 'go-form-error';
        box.setAttribute('role', 'alert');
        el.querySelector('.go-dialog__body').prepend(box);
      }
      box.textContent = message;
      box.hidden = !message;
    },
  };

  el.addEventListener('click', (e) => { if (e.target === el) el.close('dismiss'); });
  el.querySelector('[data-close]').addEventListener('click', () => el.close('dismiss'));
  el.querySelectorAll('[data-dismiss]').forEach((b) => b.addEventListener('click', () => el.close('dismiss')));
  el.addEventListener('close', () => { onClose?.(el.returnValue); el.remove(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!onSubmit) return;
    const keep = await onSubmit(form, ctx);
    if (keep !== false) el.close('submit');
  });

  el.showModal();
  onOpen?.(ctx);
  return ctx;
}

export function confirmDialog({ title, message, confirmLabel = 'تأیید', danger = false }) {
  return new Promise((resolve) => {
    let answer = false;
    openDialog({
      title,
      body: `<p class="go-confirm">${message}</p>`,
      footer: `
        <button type="submit" class="gm-btn ${danger ? 'go-btn--danger' : 'gm-btn--primary'}">${esc(confirmLabel)}</button>
        <button type="button" class="gm-btn gm-btn--secondary" data-dismiss>انصراف</button>`,
      onSubmit: () => { answer = true; },
      onClose: () => resolve(answer),
    });
  });
}

export function isDialogOpen() {
  return !!document.querySelector('dialog[open]');
}
