// GeekOrbit — history of events.

import { getChangelog } from '../data.js';
import { icon, iconButton } from '../ui.js';
import { fmtDate, u } from '../util.js';
import { mount, pageHead, emptyState } from './common.js';
import { eventDialog, removeEvent } from '../dialogs.js';

export function render(root) {
  const events = getChangelog();
  const el = mount(root, `
    ${pageHead('تغییرات', 'تاریخچه‌ی کارهای مهم.',
      `<button type="button" class="gm-btn gm-btn--primary" data-act="new">${icon('plus-lg')} رویداد تازه</button>`)}
    ${events.length ? `<div class="gm-card"><ol class="go-timeline">${events.map((ev) => `
      <li><time datetime="${ev.date}">${fmtDate(ev.date)}</time>
      <span>${u(ev.description)}</span>
      <span class="go-timeline__act">${iconButton({ icon: 'trash3', label: 'حذف رویداد', cls: 'go-iconbtn--danger', attrs: `data-act="delete" data-id="${ev.id}"` })}</span></li>`).join('')}</ol></div>`
      : `<div class="gm-card">${emptyState({ iconName: 'clock-history', title: 'تاریخچه خالی است', text: 'تصمیم‌ها و نقطه‌عطف‌ها را اینجا بنویسید.', actionLabel: 'رویداد تازه', actionAct: 'new' })}</div>`}`);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'new') eventDialog();
    if (b.dataset.act === 'delete') removeEvent(Number(b.dataset.id));
  });
}
