// GeekOrbit — create/edit dialogs for projects, chats, accounts, tags and events.

import {
  getAccounts, getProjects, getChats, getTags, saveProject, deleteProject, saveChat, deleteChat,
  saveAccount, deleteAccount, saveTag, deleteTag, tagByName, addEvent, deleteEvent,
  findDuplicateLink, nextProjectCode,
} from './data.js';
import { tx } from './db.js';
import { STATUSES, PRIORITIES } from './model.js';
import { esc, u, fa, todayISO, fmtDate, isSafeUrl, daysSince } from './util.js';
import { openDialog, confirmDialog, toast, icon, accountOrdinals, accountLabel } from './ui.js';
import { dateFieldHTML, mountDateFields } from './datefield.js';
import { copyHandoff } from './handoff.js';

const options = (items, current) => items
  .map((i) => `<option value="${esc(i.key)}"${i.key === current ? ' selected' : ''}>${esc(i.label)}</option>`).join('');

const SAVE_FOOT = (label = 'ذخیره') => `
  <button type="submit" class="gm-btn gm-btn--primary">${label}</button>
  <button type="button" class="gm-btn gm-btn--secondary" data-dismiss>انصراف</button>`;

const uniqueMessage = (err, text) => (/UNIQUE/i.test(String(err?.message)) ? text : 'ذخیره انجام نشد. دوباره تلاش کنید.');

// ---- project ---------------------------------------------------------------------

export function projectDialog(id = null) {
  const accounts = getAccounts();
  if (!accounts.length) { toast('اول یک حساب بسازید.', { danger: true }); location.hash = '#/accounts'; return; }
  const ordinals = accountOrdinals(accounts);
  const tags = getTags();
  const p = id ? getProjects().find((x) => x.id === id) : {
    code: nextProjectCode(), name: '', description: '', status: 'active', priority: 'P1',
    progress: 0, start_date: todayISO(), last_activity: todayISO(), account_ids: [], tags: [],
  };
  openDialog({
    title: id ? 'ویرایش پروژه' : 'پروژه‌ی تازه',
    wide: true,
    body: `
      <div class="go-fieldrow">
        <div class="go-field"><label for="f-code">کد</label>
          <input class="go-input go-input--code" id="f-code" name="code" value="${esc(p.code)}" required maxlength="20"></div>
        <div class="go-field"><label for="f-name">نام</label>
          <input class="go-input" id="f-name" name="name" value="${esc(p.name)}" required maxlength="120"></div>
      </div>
      <div class="go-field"><label for="f-desc">توضیح</label>
        <textarea class="go-textarea" id="f-desc" name="description">${esc(p.description)}</textarea></div>
      <div class="go-fieldrow">
        <div class="go-field"><label for="f-status">وضعیت</label>
          <select class="go-select" id="f-status" name="status">${options(STATUSES, p.status)}</select></div>
        <div class="go-field"><label for="f-prio">اولویت</label>
          <select class="go-select" id="f-prio" name="priority">${options(PRIORITIES, p.priority)}</select></div>
      </div>
      <div class="go-field"><label for="f-progress">پیشرفت (درصد)</label>
        <input class="go-input" id="f-progress" name="progress" type="number" min="0" max="100" step="5" inputmode="numeric" value="${p.progress}"></div>
      <div class="go-fieldrow">
        ${dateFieldHTML({ name: 'start_date', label: 'شروع', value: p.start_date, clearable: true })}
        ${dateFieldHTML({ name: 'last_activity', label: 'آخرین فعالیت', value: p.last_activity, clearable: true })}
      </div>
      <fieldset class="go-field go-fieldset"><legend class="go-label">حساب‌ها</legend>
        <div class="go-checks">${accounts.map((a) => `
          <label><input type="checkbox" name="account" value="${a.id}"${p.account_ids.includes(a.id) ? ' checked' : ''}>
          ${accountLabel(a, ordinals)}</label>`).join('')}</div></fieldset>
      <fieldset class="go-field go-fieldset"><legend class="go-label">برچسب‌ها</legend>
        ${tags.length ? `<div class="go-checks">${tags.map((t) => `
          <label><input type="checkbox" name="tag" value="${t.id}"${p.tags.some((x) => x.id === t.id) ? ' checked' : ''}> ${u(t.name)}</label>`).join('')}</div>` : ''}
        <label class="go-label go-label--sub" for="f-newtag">برچسب تازه (با ویرگول جدا کنید)</label>
        <input class="go-input" id="f-newtag" name="newtags" autocomplete="off"></fieldset>`,
    footer: SAVE_FOOT(),
    onOpen: ({ el }) => { mountDateFields(el); el.querySelector('#f-name').focus(); },
    onSubmit: (form, ctx) => {
      const f = new FormData(form);
      const code = f.get('code').trim();
      const name = f.get('name').trim();
      if (!code || !name) { ctx.setError('کد و نام را پر کنید.'); return false; }
      const accountIds = f.getAll('account').map(Number);
      if (!accountIds.length) { ctx.setError('دست‌کم یک حساب انتخاب کنید.'); return false; }
      const progress = Math.max(0, Math.min(100, Math.round(Number(f.get('progress')) || 0)));
      try {
        tx(() => {
          const tagIds = f.getAll('tag').map(Number);
          for (const raw of String(f.get('newtags')).split(/[,،]/).map((s) => s.trim()).filter(Boolean)) {
            const existing = tagByName(raw);
            tagIds.push(existing ? existing.id : saveTag(raw));
          }
          saveProject({
            code, name, description: f.get('description').trim(), status: f.get('status'),
            priority: f.get('priority'), progress, start_date: f.get('start_date'),
            last_activity: f.get('last_activity'), account_ids: accountIds, tag_ids: [...new Set(tagIds)],
          }, id);
        });
        toast(id ? 'پروژه به‌روز شد.' : 'پروژه ساخته شد.');
      } catch (err) { ctx.setError(uniqueMessage(err, 'این کد پیش از این استفاده شده است.')); return false; }
    },
  });
}

export async function removeProject(id) {
  const p = getProjects().find((x) => x.id === id);
  if (!p) return;
  const ok = await confirmDialog({
    title: 'حذف پروژه', danger: true, confirmLabel: 'حذف',
    message: `پروژه‌ی ${u(p.name)} حذف شود؟ ${p.chat_count ? `${fa(p.chat_count)} چت آن می‌ماند و بدون پروژه می‌شود.` : ''}`,
  });
  if (ok) { deleteProject(id); toast('پروژه حذف شد.'); }
}

// ---- chat ---------------------------------------------------------------------------

export function chatDialog(id = null, preset = {}) {
  const accounts = getAccounts();
  const projects = getProjects();
  if (!accounts.length) { toast('اول یک حساب بسازید.', { danger: true }); location.hash = '#/accounts'; return; }
  const ordinals = accountOrdinals(accounts);
  const chat = id ? getChats().find((c) => c.id === id) : {
    project_id: preset.project_id ?? null, phase: '', account_id: preset.account_id ?? accounts[0].id,
    chat_link: '', summary: '', status: 'active', start_date: todayISO(), last_update: todayISO(), next_step: '',
  };
  const accountNote = (accId) => {
    const a = accounts.find((x) => x.id === Number(accId));
    if (!a || !a.limited_until) return '';
    const left = daysSince(a.limited_until);
    return left !== null && left <= 0
      ? `${icon('hourglass-split')}<span>این حساب تا ${fmtDate(a.limited_until)} محدود است.</span>` : '';
  };
  openDialog({
    title: id ? 'ویرایش چت' : 'چت تازه',
    wide: true,
    body: `
      <div class="go-fieldrow">
        <div class="go-field"><label for="f-project">پروژه</label>
          <select class="go-select" id="f-project" name="project_id">
            <option value="">بدون پروژه</option>
            ${projects.map((p) => `<option value="${p.id}"${p.id === chat.project_id ? ' selected' : ''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}
          </select></div>
        <div class="go-field"><label for="f-account">حساب</label>
          <select class="go-select" id="f-account" name="account_id">
            ${accounts.map((a) => `<option value="${a.id}"${a.id === chat.account_id ? ' selected' : ''}>${fa(ordinals.get(a.id))} · ${esc(a.name)}</option>`).join('')}
          </select></div>
      </div>
      <div class="go-note" id="f-limit" role="status" ${accountNote(chat.account_id) ? '' : 'hidden'}>${accountNote(chat.account_id)}</div>
      <div class="go-field"><label for="f-phase">مرحله</label>
        <input class="go-input" id="f-phase" name="phase" value="${esc(chat.phase)}" maxlength="120"></div>
      <div class="go-field"><label for="f-link">پیوند چت</label>
        <input class="go-input go-input--code" id="f-link" name="chat_link" value="${esc(chat.chat_link)}" placeholder="https://…" inputmode="url" autocomplete="off">
        <div class="go-note" id="f-dup" role="status" hidden></div></div>
      <div class="go-field"><label for="f-summary">خلاصه</label>
        <textarea class="go-textarea" id="f-summary" name="summary">${esc(chat.summary)}</textarea></div>
      <div class="go-field"><label for="f-next">گام بعدی</label>
        <textarea class="go-textarea" id="f-next" name="next_step">${esc(chat.next_step)}</textarea></div>
      <div class="go-field"><label for="f-cstatus">وضعیت</label>
        <select class="go-select" id="f-cstatus" name="status">${options(STATUSES, chat.status)}</select></div>
      <div class="go-fieldrow">
        ${dateFieldHTML({ name: 'start_date', label: 'شروع', value: chat.start_date, clearable: true })}
        ${dateFieldHTML({ name: 'last_update', label: 'آخرین به‌روزرسانی', value: chat.last_update, clearable: true })}
      </div>`,
    footer: `${SAVE_FOOT()}${id ? `<button type="button" class="gm-btn gm-btn--secondary" data-handoff>${icon('clipboard')} کپی یادداشت تحویل</button>` : ''}`,
    onOpen: ({ el }) => {
      mountDateFields(el);
      const link = el.querySelector('#f-link');
      const dup = el.querySelector('#f-dup');
      const limit = el.querySelector('#f-limit');
      const checkDup = () => {
        const hit = findDuplicateLink(link.value, id);
        dup.hidden = !hit;
        if (hit) dup.innerHTML = `${icon('info-circle')}<span>این پیوند پیش‌تر ثبت شده است${hit.project_code ? ` (پروژه‌ی ${u(hit.project_code)})` : ''}. ذخیره کردن مانعی ندارد.</span>`;
      };
      link.addEventListener('input', checkDup);
      checkDup();
      el.querySelector('#f-account').addEventListener('change', (e) => {
        const html = accountNote(e.target.value);
        limit.hidden = !html; limit.innerHTML = html;
      });
      el.querySelector('[data-handoff]')?.addEventListener('click', () => copyHandoff(chat));
      el.querySelector('#f-phase').focus();
    },
    onSubmit: (form, ctx) => {
      const f = new FormData(form);
      const link = f.get('chat_link').trim();
      if (link && !isSafeUrl(link)) { ctx.setError('پیوند باید با https:// یا http:// شروع شود.'); return false; }
      const summary = f.get('summary').trim();
      const phase = f.get('phase').trim();
      if (!summary && !phase) { ctx.setError('دست‌کم مرحله یا خلاصه را بنویسید.'); return false; }
      saveChat({
        project_id: f.get('project_id') ? Number(f.get('project_id')) : null,
        phase, account_id: Number(f.get('account_id')), chat_link: link, summary,
        status: f.get('status'), start_date: f.get('start_date'),
        last_update: f.get('last_update') || todayISO(), next_step: f.get('next_step').trim(),
      }, id);
      toast(id ? 'چت به‌روز شد.' : 'چت ثبت شد.');
    },
  });
}

export async function removeChat(id) {
  const ok = await confirmDialog({ title: 'حذف چت', danger: true, confirmLabel: 'حذف', message: 'این چت از فهرست حذف شود؟ پیوند و یادداشت‌هایش از بین می‌رود.' });
  if (ok) { deleteChat(id); toast('چت حذف شد.'); }
}

// ---- account -------------------------------------------------------------------------

export function accountDialog(id = null) {
  const a = id ? getAccounts().find((x) => x.id === id) : { name: '', role: '', note: '', limited_until: '' };
  openDialog({
    title: id ? 'ویرایش حساب' : 'حساب تازه',
    body: `
      <div class="go-field"><label for="f-aname">نام حساب</label>
        <input class="go-input" id="f-aname" name="name" value="${esc(a.name)}" required maxlength="80"></div>
      <div class="go-field"><label for="f-role">نقش</label>
        <input class="go-input" id="f-role" name="role" value="${esc(a.role)}" maxlength="120">
        <p class="go-hint">مثلاً «کدنویسی» یا «نوشتن».</p></div>
      <div class="go-field"><label for="f-anote">یادداشت</label>
        <textarea class="go-textarea" id="f-anote" name="note">${esc(a.note)}</textarea></div>
      ${dateFieldHTML({ name: 'limited_until', label: 'محدود تا', value: a.limited_until, clearable: true })}
      <p class="go-hint">اگر حساب به سقف استفاده رسیده، تاریخ بازشدن را بزنید تا در کارت‌ها دیده شود.</p>`,
    footer: SAVE_FOOT(),
    onOpen: ({ el }) => { mountDateFields(el); el.querySelector('#f-aname').focus(); },
    onSubmit: (form, ctx) => {
      const f = new FormData(form);
      const name = f.get('name').trim();
      if (!name) { ctx.setError('نام حساب را بنویسید.'); return false; }
      try {
        saveAccount({ name, role: f.get('role').trim(), note: f.get('note').trim(), limited_until: f.get('limited_until') }, id);
        toast(id ? 'حساب به‌روز شد.' : 'حساب ساخته شد.');
      } catch (err) { ctx.setError(uniqueMessage(err, 'حسابی با این نام هست.')); return false; }
    },
  });
}

export async function removeAccount(id) {
  const a = getAccounts().find((x) => x.id === id);
  if (!a) return;
  const ok = await confirmDialog({
    title: 'حذف حساب', danger: true, confirmLabel: 'حذف',
    message: `حساب ${u(a.name)} حذف شود؟ ${a.chat_count ? `${fa(a.chat_count)} چت آن بدون حساب می‌ماند. ` : ''}از پروژه‌ها هم برداشته می‌شود.`,
  });
  if (ok) { deleteAccount(id); toast('حساب حذف شد.'); }
}

// ---- tag ------------------------------------------------------------------------------

export function tagDialog(id = null) {
  const t = id ? getTags().find((x) => x.id === id) : { name: '' };
  openDialog({
    title: id ? 'ویرایش برچسب' : 'برچسب تازه',
    body: `<div class="go-field"><label for="f-tname">نام برچسب</label>
      <input class="go-input" id="f-tname" name="name" value="${esc(t.name)}" required maxlength="40"></div>`,
    footer: SAVE_FOOT(),
    onOpen: ({ el }) => el.querySelector('#f-tname').focus(),
    onSubmit: (form, ctx) => {
      const name = new FormData(form).get('name').trim();
      if (!name) { ctx.setError('نام برچسب را بنویسید.'); return false; }
      try { saveTag(name, id); toast(id ? 'برچسب به‌روز شد.' : 'برچسب ساخته شد.'); }
      catch (err) { ctx.setError(uniqueMessage(err, 'این برچسب هست.')); return false; }
    },
  });
}

export async function removeTag(id) {
  const t = getTags().find((x) => x.id === id);
  if (!t) return;
  const ok = await confirmDialog({ title: 'حذف برچسب', danger: true, confirmLabel: 'حذف', message: `برچسب ${u(t.name)} از همه‌ی پروژه‌ها برداشته شود؟` });
  if (ok) { deleteTag(id); toast('برچسب حذف شد.'); }
}

// ---- event -----------------------------------------------------------------------------

export function eventDialog() {
  openDialog({
    title: 'رویداد تازه',
    body: `
      ${dateFieldHTML({ name: 'date', label: 'تاریخ', value: todayISO() })}
      <div class="go-field"><label for="f-edesc">توضیح</label>
        <textarea class="go-textarea" id="f-edesc" name="description" required></textarea></div>`,
    footer: SAVE_FOOT(),
    onOpen: ({ el }) => { mountDateFields(el); el.querySelector('#f-edesc').focus(); },
    onSubmit: (form, ctx) => {
      const f = new FormData(form);
      const text = f.get('description').trim();
      if (!text) { ctx.setError('توضیح رویداد را بنویسید.'); return false; }
      addEvent(f.get('date') || todayISO(), text);
      toast('رویداد ثبت شد.');
    },
  });
}

export async function removeEvent(id) {
  const ok = await confirmDialog({ title: 'حذف رویداد', danger: true, confirmLabel: 'حذف', message: 'این رویداد از تاریخچه حذف شود؟' });
  if (ok) { deleteEvent(id); toast('رویداد حذف شد.'); }
}
