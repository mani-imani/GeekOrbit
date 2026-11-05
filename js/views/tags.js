// GeekOrbit — tags.

import { getTags } from '../data.js';
import { icon, iconButton } from '../ui.js';
import { fa, u } from '../util.js';
import { mount, pageHead, emptyState } from './common.js';
import { tagDialog, removeTag } from '../dialogs.js';

export function render(root) {
  const tags = getTags();
  const el = mount(root, `
    ${pageHead('برچسب‌ها', 'پروژه‌ها را با برچسب گروه‌بندی کنید.',
      `<button type="button" class="gm-btn gm-btn--primary" data-act="new">${icon('plus-lg')} برچسب تازه</button>`)}
    ${tags.length ? `<ul class="go-tags">${tags.map((t) => `
      <li class="go-tagchip">
        <a href="#/projects?tag=${t.id}">${u(t.name)} <span class="n">${fa(t.project_count)}</span></a>
        ${iconButton({ icon: 'pencil', label: `ویرایش ${t.name}`, attrs: `data-act="edit" data-id="${t.id}"` })}
        ${iconButton({ icon: 'trash3', label: `حذف ${t.name}`, cls: 'go-iconbtn--danger', attrs: `data-act="delete" data-id="${t.id}"` })}
      </li>`).join('')}</ul>`
      : `<div class="gm-card">${emptyState({ iconName: 'tags', title: 'هنوز برچسبی نیست', text: 'برچسب‌ها هنگام ساخت پروژه هم ساخته می‌شوند.', actionLabel: 'برچسب تازه', actionAct: 'new' })}</div>`}`);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = Number(b.dataset.id);
    if (b.dataset.act === 'new') tagDialog();
    if (b.dataset.act === 'edit') tagDialog(id);
    if (b.dataset.act === 'delete') removeTag(id);
  });
}
