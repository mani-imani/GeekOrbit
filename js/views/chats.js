// GeekOrbit — chats: filterable table (cards on phones).

import { getAccounts, getProjects, getChats, getTags } from '../data.js';
import { icon, accountOrdinals, accountLabel, statusHtml } from '../ui.js';
import { esc, fa, u, relDays, fmtDate } from '../util.js';
import { STATUSES } from '../model.js';
import { mount, pageHead, emptyState, limitedHtml, staleHtml, chatActions, projectTitle } from './common.js';
import { replaceParams } from '../router.js';
import { chatDialog, removeChat } from '../dialogs.js';
import { copyHandoff } from '../handoff.js';

let query = '';

const sel = (id, label, items, current, all = 'همه') => `
  <label class="go-visually-hidden" for="${id}">${label}</label>
  <select class="go-select" id="${id}" data-filter="${id.replace('flt-', '')}">
    <option value="">${label}: ${all}</option>
    ${items.map((i) => `<option value="${i.value}"${String(i.value) === String(current) ? ' selected' : ''}>${esc(i.label)}</option>`).join('')}
  </select>`;

export function render(root, params) {
  const accounts = getAccounts();
  const projects = getProjects();
  const tags = getTags();
  const ordinals = accountOrdinals(accounts);
  const state = { account: params.account || '', project: params.project || '', status: params.status || '', tag: params.tag || '', stale: params.stale === '1' };
  const el = mount(root, '');

  el.innerHTML = `
    ${pageHead('چت‌ها', 'هر گفت‌وگو کجاست و بعدش چه باید کرد.',
      `<button type="button" class="gm-btn gm-btn--primary" data-act="new-chat">${icon('plus-lg')} چت تازه</button>`)}
    <div class="go-toolbar" role="search">
      <div class="go-search">${icon('search')}
        <label class="go-visually-hidden" for="flt-q">جست‌وجو در چت‌ها</label>
        <input class="go-input" id="flt-q" type="search" placeholder="جست‌وجو" value="${esc(query)}" autocomplete="off" data-search>
      </div>
      ${sel('flt-account', 'حساب', accounts.map((a) => ({ value: a.id, label: a.name })), state.account)}
      ${sel('flt-project', 'پروژه', [{ value: 'none', label: 'بدون پروژه' }, ...projects.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))], state.project)}
      ${sel('flt-status', 'وضعیت', STATUSES.map((s) => ({ value: s.key, label: s.label })), state.status)}
      ${tags.length ? sel('flt-tag', 'برچسب', tags.map((t) => ({ value: t.id, label: t.name })), state.tag) : ''}
      <label class="go-check"><input type="checkbox" id="flt-stale" data-filter="stale"${state.stale ? ' checked' : ''}> فقط بی‌تغییرها</label>
    </div>
    <div id="results" aria-live="polite"></div>`;

  const results = el.querySelector('#results');
  const projectTags = new Map(projects.map((p) => [p.id, p.tags.map((t) => t.id)]));

  function draw() {
    const q = query.trim().toLowerCase();
    const rows = getChats().filter((c) => {
      if (state.account && String(c.account_id) !== state.account) return false;
      if (state.project === 'none' ? c.project_id !== null : (state.project && String(c.project_id) !== state.project)) return false;
      if (state.status && c.status !== state.status) return false;
      if (state.stale && !c.stale) return false;
      if (state.tag && !(projectTags.get(c.project_id) || []).includes(Number(state.tag))) return false;
      if (q && ![c.phase, c.summary, c.next_step, c.project_name, c.project_code, c.account_name, c.chat_link].join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
    if (!rows.length) {
      results.innerHTML = `<div class="gm-card">${emptyState(getChats().length
        ? { iconName: 'search', title: 'چیزی پیدا نشد', text: 'فیلترها را کم کنید یا عبارت دیگری بنویسید.' }
        : { iconName: 'chat-left-text', title: 'هنوز چتی ثبت نشده', text: 'هر گفت‌وگوی مهم را با پیوند و گام بعدی‌اش ثبت کنید.', actionLabel: 'چت تازه', actionAct: 'new-chat' })}</div>`;
      return;
    }
    results.innerHTML = `<div class="go-tablewrap"><table class="go-table">
      <caption class="go-visually-hidden">فهرست چت‌ها، ${fa(rows.length)} مورد</caption>
      <thead><tr><th scope="col">پروژه</th><th scope="col">حساب</th><th scope="col">مرحله و خلاصه</th><th scope="col">وضعیت</th><th scope="col">به‌روزرسانی</th><th scope="col"><span class="go-visually-hidden">کارها</span></th></tr></thead>
      <tbody>${rows.map((c) => {
        const acc = accounts.find((a) => a.id === c.account_id);
        return `<tr>
          <td class="go-cell--main" data-label="پروژه">${projectTitle(c)}</td>
          <td data-label="حساب">${accountLabel(acc, ordinals)}${limitedHtml(acc) ? `<span class="go-sub">${limitedHtml(acc)}</span>` : ''}</td>
          <td data-label="خلاصه">${c.phase ? `<strong>${u(c.phase)}</strong>` : ''}${c.summary ? `<span class="go-sub">${u(c.summary)}</span>` : ''}${c.next_step ? `<span class="go-sub">گام بعدی: ${u(c.next_step)}</span>` : ''}</td>
          <td data-label="وضعیت" class="go-cell--nowrap">${statusHtml(c.status)}${c.stale ? `<span class="go-sub">${staleHtml(c)}</span>` : ''}</td>
          <td data-label="به‌روزرسانی" class="go-cell--nowrap">${fmtDate(c.last_update)}<span class="go-sub">${relDays(c.last_update)}</span></td>
          <td class="go-cell--actions">${chatActions(c)}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  }
  draw();

  const sync = () => replaceParams('chats', { account: state.account, project: state.project, status: state.status, tag: state.tag, stale: state.stale ? '1' : '' });
  el.addEventListener('change', (e) => {
    const f = e.target.dataset.filter;
    if (!f) return;
    state[f] = f === 'stale' ? e.target.checked : e.target.value;
    sync(); draw();
  });
  el.querySelector('[data-search]').addEventListener('input', (e) => { query = e.target.value; draw(); });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = Number(b.dataset.id);
    if (b.dataset.act === 'new-chat') chatDialog(null, { project_id: state.project && state.project !== 'none' ? Number(state.project) : null, account_id: state.account ? Number(state.account) : undefined });
    if (b.dataset.act === 'edit-chat') chatDialog(id);
    if (b.dataset.act === 'delete-chat') removeChat(id);
    if (b.dataset.act === 'handoff') copyHandoff(getChats().find((c) => c.id === id));
  });
}
