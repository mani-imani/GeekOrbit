// GeekOrbit — accounts as cards.

import { getAccounts } from '../data.js';
import { icon, iconButton, accountOrdinals, accountMark } from '../ui.js';
import { fa, u } from '../util.js';
import { mount, pageHead, emptyState, limitedHtml } from './common.js';
import { accountDialog, removeAccount } from '../dialogs.js';

export function render(root) {
  const accounts = getAccounts();
  const ordinals = accountOrdinals(accounts);
  const el = mount(root, `
    ${pageHead('حساب‌ها', 'چت‌بات‌هایی که روی آن‌ها کار می‌کنید.',
      `<button type="button" class="gm-btn gm-btn--primary" data-act="new">${icon('plus-lg')} حساب تازه</button>`)}
    ${accounts.length ? `<div class="go-accgrid">${accounts.map((a) => `
      <article class="gm-card go-acccard">
        <div class="go-acccard__head">
          <h2 class="go-acccard__name">${accountMark(ordinals.get(a.id)).replace('go-acc"', 'go-acc go-acc--lg"')}<bdi>${u(a.name)}</bdi></h2>
          <div>${iconButton({ icon: 'pencil', label: `ویرایش ${a.name}`, attrs: `data-act="edit" data-id="${a.id}"` })}
          ${iconButton({ icon: 'trash3', label: `حذف ${a.name}`, cls: 'go-iconbtn--danger', attrs: `data-act="delete" data-id="${a.id}"` })}</div>
        </div>
        <p class="go-acccard__role">${a.role ? u(a.role) : ''}</p>
        ${limitedHtml(a)}
        <div class="go-acccard__stats">
          <a href="#/chats?account=${a.id}"><strong>${fa(a.open_count)}</strong><span>چت باز</span></a>
          <a href="#/projects?account=${a.id}"><strong>${fa(a.project_count)}</strong><span>پروژه</span></a>
        </div>
        ${a.note ? `<p class="go-acccard__note">${u(a.note)}</p>` : ''}
      </article>`).join('')}</div>`
      : `<div class="gm-card">${emptyState({ iconName: 'person-badge', title: 'هنوز حسابی نیست', text: 'هر حساب چت‌بات را با یک نام کوتاه ثبت کنید.', actionLabel: 'حساب تازه', actionAct: 'new' })}</div>`}`);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = Number(b.dataset.id);
    if (b.dataset.act === 'new') accountDialog();
    if (b.dataset.act === 'edit') accountDialog(id);
    if (b.dataset.act === 'delete') removeAccount(id);
  });
}
