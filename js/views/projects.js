// GeekOrbit — projects table.

import { getAccounts, getProjects, getTags } from '../data.js';
import { icon, accountOrdinals, accountMark, statusHtml, tagHtml, iconButton } from '../ui.js';
import { esc, fa, u, fmtDate } from '../util.js';
import { STATUSES, priorityLabel } from '../model.js';
import { mount, pageHead, emptyState } from './common.js';
import { replaceParams } from '../router.js';
import { projectDialog, removeProject, chatDialog } from '../dialogs.js';

let query = '';

const sel = (id, label, items, current) => `
  <label class="go-visually-hidden" for="${id}">${label}</label>
  <select class="go-select" id="${id}" data-filter="${id.replace('flt-', '')}">
    <option value="">${label}: همه</option>
    ${items.map((i) => `<option value="${i.value}"${String(i.value) === String(current) ? ' selected' : ''}>${esc(i.label)}</option>`).join('')}
  </select>`;

export function render(root, params) {
  const accounts = getAccounts();
  const tags = getTags();
  const ordinals = accountOrdinals(accounts);
  const state = { status: params.status || '', tag: params.tag || '', account: params.account || '' };
  const el = mount(root, '');

  el.innerHTML = `
    ${pageHead('پروژه‌ها', 'هر پروژه روی کدام حساب‌ها کار می‌شود.',
      `<button type="button" class="gm-btn gm-btn--primary" data-act="new-project">${icon('plus-lg')} پروژه‌ی تازه</button>`)}
    <div class="go-toolbar" role="search">
      <div class="go-search">${icon('search')}
        <label class="go-visually-hidden" for="flt-q">جست‌وجو در پروژه‌ها</label>
        <input class="go-input" id="flt-q" type="search" placeholder="جست‌وجو" value="${esc(query)}" autocomplete="off" data-search>
      </div>
      ${sel('flt-status', 'وضعیت', STATUSES.map((s) => ({ value: s.key, label: s.label })), state.status)}
      ${sel('flt-account', 'حساب', accounts.map((a) => ({ value: a.id, label: a.name })), state.account)}
      ${tags.length ? sel('flt-tag', 'برچسب', tags.map((t) => ({ value: t.id, label: t.name })), state.tag) : ''}
    </div>
    <div id="results" aria-live="polite"></div>`;
  const results = el.querySelector('#results');

  function draw() {
    const q = query.trim().toLowerCase();
    const all = getProjects();
    const rows = all.filter((p) => {
      if (state.status && p.status !== state.status) return false;
      if (state.account && !p.account_ids.includes(Number(state.account))) return false;
      if (state.tag && !p.tags.some((t) => t.id === Number(state.tag))) return false;
      if (q && ![p.code, p.name, p.description, p.tags.map((t) => t.name).join(' ')].join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
    if (!rows.length) {
      results.innerHTML = `<div class="gm-card">${emptyState(all.length
        ? { iconName: 'search', title: 'چیزی پیدا نشد', text: 'فیلترها را کم کنید یا عبارت دیگری بنویسید.' }
        : { iconName: 'folder2', title: 'هنوز پروژه‌ای نیست', text: 'پروژه‌هایتان را با کد کوتاه ثبت کنید و به حساب‌ها وصل کنید.', actionLabel: 'پروژه‌ی تازه', actionAct: 'new-project' })}</div>`;
      return;
    }
    results.innerHTML = `<div class="go-tablewrap"><table class="go-table">
      <caption class="go-visually-hidden">فهرست پروژه‌ها، ${fa(rows.length)} مورد</caption>
      <thead><tr><th scope="col">پروژه</th><th scope="col">وضعیت</th><th scope="col">پیشرفت</th><th scope="col">حساب‌ها</th><th scope="col">چت‌ها</th><th scope="col">آخرین فعالیت</th><th scope="col"><span class="go-visually-hidden">کارها</span></th></tr></thead>
      <tbody>${rows.map((p) => `<tr>
        <td class="go-cell--main" data-label="پروژه"><strong><bdi>${esc(p.code)}</bdi></strong> ${u(p.name)}
          ${p.description ? `<span class="go-sub">${u(p.description)}</span>` : ''}
          ${p.tags.length ? `<span class="go-sub">${p.tags.map((t) => tagHtml(t.name)).join('')}</span>` : ''}</td>
        <td data-label="وضعیت" class="go-cell--nowrap">${statusHtml(p.status)}<span class="go-sub">${esc(priorityLabel(p.priority))}</span></td>
        <td data-label="پیشرفت"><div class="go-progress"><div class="go-progress__bar"><i style="--p:${p.progress}%"></i></div><span>${fa(p.progress)}٪</span></div></td>
        <td data-label="حساب‌ها"><span class="go-acclist">${p.account_ids.map((id) => {
          const a = accounts.find((x) => x.id === id);
          return a ? `<a class="go-acctag" href="#/projects?account=${a.id}" title="${esc(a.name)}">${accountMark(ordinals.get(a.id))}<span class="go-visually-hidden">${esc(a.name)}</span></a>` : '';
        }).join('')}</span></td>
        <td data-label="چت‌ها" class="go-cell--nowrap"><a href="#/chats?project=${p.id}">${fa(p.chat_count)} چت</a></td>
        <td data-label="آخرین فعالیت" class="go-cell--nowrap">${fmtDate(p.last_activity)}</td>
        <td class="go-cell--actions">
          ${iconButton({ icon: 'plus-lg', label: `چت تازه برای ${p.name}`, attrs: `data-act="chat-for" data-id="${p.id}"` })}
          ${iconButton({ icon: 'pencil', label: `ویرایش ${p.name}`, attrs: `data-act="edit" data-id="${p.id}"` })}
          ${iconButton({ icon: 'trash3', label: `حذف ${p.name}`, cls: 'go-iconbtn--danger', attrs: `data-act="delete" data-id="${p.id}"` })}
        </td></tr>`).join('')}</tbody></table></div>`;
  }
  draw();

  el.addEventListener('change', (e) => {
    const f = e.target.dataset.filter;
    if (!f) return;
    state[f] = e.target.value;
    replaceParams('projects', state); draw();
  });
  el.querySelector('[data-search]').addEventListener('input', (e) => { query = e.target.value; draw(); });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = Number(b.dataset.id);
    if (b.dataset.act === 'new-project') projectDialog();
    if (b.dataset.act === 'edit') projectDialog(id);
    if (b.dataset.act === 'delete') removeProject(id);
    if (b.dataset.act === 'chat-for') chatDialog(null, { project_id: id });
  });
}
