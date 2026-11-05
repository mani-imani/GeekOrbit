// GeekOrbit — pieces shared by the views.

import { esc, fa, fmtDate, relDays, daysSince, isSafeUrl, u } from '../util.js';
import { icon, iconButton } from '../ui.js';
import { staleDays } from '../data.js';

export function pageHead(title, subtitle = '', actions = '') {
  return `<div class="go-pagehead">
    <div><h1>${esc(title)}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</div>
    <div class="go-pagehead__actions">${actions}</div>
  </div>`;
}

export function emptyState({ iconName, title, text, actionLabel = '', actionAct = '' }) {
  return `<div class="go-empty">
    ${icon(iconName, 32)}
    <h3>${esc(title)}</h3>
    <p>${text}</p>
    ${actionLabel ? `<button type="button" class="gm-btn gm-btn--primary" data-act="${actionAct}">${icon('plus-lg')} ${esc(actionLabel)}</button>` : ''}
  </div>`;
}

export function limitedHtml(account) {
  if (!account || !account.limited_until) return '';
  const n = daysSince(account.limited_until);
  if (n === null || n > 0) return '';
  return `<span class="go-limited">${icon('hourglass-split', 14)}تا ${fmtDate(account.limited_until)} محدود است</span>`;
}

export function staleHtml(chat) {
  return chat.stale ? `<span class="go-stale">${icon('clock', 14)}${staleText(chat)}</span>` : '';
}
export const staleText = (chat) => `${fa(staleDays(chat))} روز بی‌تغییر`;

export function chatActions(chat) {
  const link = chat.chat_link && isSafeUrl(chat.chat_link)
    ? `<a class="go-iconbtn" href="${esc(chat.chat_link)}" target="_blank" rel="noopener noreferrer" aria-label="باز کردن چت" title="باز کردن چت">${icon('box-arrow-up-right')}</a>` : '';
  return `${iconButton({ icon: 'clipboard', label: 'کپی یادداشت تحویل', attrs: `data-act="handoff" data-id="${chat.id}"` })}
    ${link}
    ${iconButton({ icon: 'pencil', label: 'ویرایش چت', attrs: `data-act="edit-chat" data-id="${chat.id}"` })}
    ${iconButton({ icon: 'trash3', label: 'حذف چت', cls: 'go-iconbtn--danger', attrs: `data-act="delete-chat" data-id="${chat.id}"` })}`;
}

export const projectTitle = (c) => (c.project_code
  ? `<a href="#/chats?project=${c.project_id}"><bdi>${esc(c.project_code)}</bdi></a> <span class="gm-muted">${u(c.project_name)}</span>`
  : '<span class="gm-muted">بدون پروژه</span>');

export { relDays };

/** Render into a fresh container each time so listeners never pile up. */
export function mount(root, html) {
  const el = document.createElement('div');
  el.className = 'go-view';
  el.tabIndex = -1;
  el.innerHTML = html;
  root.replaceChildren(el);
  return el;
}
