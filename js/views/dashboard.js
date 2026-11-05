// GeekOrbit — dashboard: numbers, backup reminder, «continue», orbit of accounts, stale chats.

import { getAccounts, getProjects, getChats } from '../data.js';
import { icon, accountOrdinals, accountMark, accountLabel, statusHtml } from '../ui.js';
import { esc, fa, u, relDays } from '../util.js';
import { mount, pageHead, emptyState, limitedHtml, staleHtml, chatActions, projectTitle } from './common.js';
import { backupState, backupAgeText, openBackupDialog } from '../backup.js';
import { chatDialog, projectDialog, accountDialog, removeChat } from '../dialogs.js';
import { copyHandoff } from '../handoff.js';

function orbitSvg(accounts, ordinals, openTotal) {
  const size = 340; const c = size / 2; const ring = 118; const n = accounts.length;
  const nodes = accounts.map((a, i) => {
    const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / n;
    const x = (c + ring * Math.cos(angle)).toFixed(1);
    const y = (c + ring * Math.sin(angle)).toFixed(1);
    const ord = Math.min(ordinals.get(a.id), 9);
    return `<a href="#/chats?account=${a.id}" aria-label="${esc(a.name)}، ${fa(a.open_count)} چت باز">
      <g data-n="${ord}"><circle class="go-orbit__node" cx="${x}" cy="${y}" r="24"></circle>
      <text class="go-orbit__num" x="${x}" y="${y}" font-size="16">${fa(ordinals.get(a.id))}</text></g></a>`;
  }).join('');
  return `<svg class="go-orbit__svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${fa(n)} حساب و ${fa(openTotal)} چت باز">
    <circle class="go-orbit__ring" cx="${c}" cy="${c}" r="${ring}"></circle>
    <circle class="go-orbit__core" cx="${c}" cy="${c}" r="38"></circle>
    <text class="go-orbit__num go-orbit__corenum" x="${c}" y="${c}" font-size="26">${fa(openTotal)}</text>
    ${nodes}
  </svg>`;
}

export function render(root) {
  const accounts = getAccounts();
  const projects = getProjects();
  const chats = getChats();
  const el = mount(root, '');

  const act = (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = Number(b.dataset.id);
    const chat = chats.find((c) => c.id === id);
    ({
      'new-chat': () => chatDialog(),
      'new-project': () => projectDialog(),
      'new-account': () => accountDialog(),
      backup: () => openBackupDialog(),
      handoff: () => copyHandoff(chat),
      'edit-chat': () => chatDialog(id),
      'delete-chat': () => removeChat(id),
    })[b.dataset.act]?.();
  };
  el.addEventListener('click', act);

  if (!accounts.length) {
    el.innerHTML = pageHead('داشبورد') + `<div class="gm-card">${emptyState({
      iconName: 'person-badge', title: 'از حساب‌هایتان شروع کنید',
      text: 'هر حساب چت‌بات که دارید را اینجا ثبت کنید. بعد پروژه‌ها و چت‌ها را به آن‌ها وصل می‌کنید.',
      actionLabel: 'حساب تازه', actionAct: 'new-account',
    })}</div>`;
    return;
  }

  const ordinals = accountOrdinals(accounts);
  const open = chats.filter((c) => c.status !== 'done');
  const stale = chats.filter((c) => c.stale);
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const recent = open.slice(0, 5);
  const backup = backupState();

  el.innerHTML = `
    ${pageHead('داشبورد', 'هر پروژه و هر چت روی کدام حساب است.', `
      <button type="button" class="gm-btn gm-btn--primary" data-act="new-chat">${icon('plus-lg')} چت تازه</button>
      <button type="button" class="gm-btn gm-btn--secondary" data-act="new-project">${icon('plus-lg')} پروژه‌ی تازه</button>`)}

    ${backup.due ? `<div class="go-notice" role="status">
      <span class="go-notice__text">${icon('database-down', 20)}<span>${backupAgeText(backup)} یک نسخه‌ی پشتیبان بگیرید.</span></span>
      <button type="button" class="gm-btn gm-btn--secondary go-btn--sm" data-act="backup">پشتیبان‌گیری</button></div>` : ''}

    <div class="go-stats">
      <a class="gm-card go-stat" href="#/projects?status=active"><div class="go-stat__n">${fa(activeProjects)}</div><div class="go-stat__l">پروژه‌ی فعال</div></a>
      <a class="gm-card go-stat" href="#/chats"><div class="go-stat__n">${fa(open.length)}</div><div class="go-stat__l">چت باز</div></a>
      <a class="gm-card go-stat ${stale.length ? 'go-stat--stale' : ''}" href="#/chats?stale=1"><div class="go-stat__n">${fa(stale.length)}</div><div class="go-stat__l">چت بی‌تغییر</div></a>
      <a class="gm-card go-stat" href="#/accounts"><div class="go-stat__n">${fa(accounts.length)}</div><div class="go-stat__l">حساب</div></a>
    </div>

    <section class="go-section" aria-labelledby="h-continue">
      <div class="go-section__head"><h2 id="h-continue">ادامه بده</h2><a href="#/chats" class="gm-muted">همه‌ی چت‌ها</a></div>
      ${recent.length ? `<ul class="go-list">${recent.map((c) => `
        <li class="go-row">
          <div class="go-row__main">
            <div class="go-row__title">${projectTitle(c)}${c.phase ? `<span class="gm-muted">${u(c.phase)}</span>` : ''}</div>
            <div class="go-row__meta">
              ${statusHtml(c.status)}
              ${accountLabel(accounts.find((a) => a.id === c.account_id), ordinals)}
              <span>${relDays(c.last_update)}</span>${staleHtml(c)}
            </div>
            ${c.next_step ? `<div class="go-row__meta"><span>گام بعدی: ${u(c.next_step)}</span></div>` : ''}
          </div>
          <div class="go-row__actions">${chatActions(c)}</div>
        </li>`).join('')}</ul>`
        : `<div class="gm-card">${emptyState({ iconName: 'chat-left-text', title: 'چت بازی نیست', text: 'وقتی چت تازه‌ای شروع کردید اینجا ثبتش کنید تا بعداً پیدایش کنید.', actionLabel: 'چت تازه', actionAct: 'new-chat' })}</div>`}
    </section>

    <section class="go-section" aria-labelledby="h-orbit">
      <div class="go-section__head"><h2 id="h-orbit">مدار حساب‌ها</h2></div>
      <div class="gm-card go-orbit">
        ${orbitSvg(accounts, ordinals, open.length)}
        <ul class="go-legend">${accounts.map((a) => `
          <li><a href="#/chats?account=${a.id}">
            ${accountMark(ordinals.get(a.id))}
            <span><span class="go-legend__name">${u(a.name)}</span>
            <span class="go-legend__meta"><span>${fa(a.open_count)} چت باز</span><span>${fa(a.project_count)} پروژه</span>${limitedHtml(a)}</span></span>
          </a></li>`).join('')}</ul>
      </div>
    </section>

    ${stale.length ? `<section class="go-section" aria-labelledby="h-stale">
      <div class="go-section__head"><h2 id="h-stale">مدتی است دست نخورده‌اند</h2><a href="#/chats?stale=1" class="gm-muted">همه</a></div>
      <ul class="go-list">${stale.slice(0, 5).map((c) => `
        <li class="go-row">
          <div class="go-row__main">
            <div class="go-row__title">${projectTitle(c)}${c.phase ? `<span class="gm-muted">${u(c.phase)}</span>` : ''}</div>
            <div class="go-row__meta">${staleHtml(c)}${accountLabel(accounts.find((a) => a.id === c.account_id), ordinals)}</div>
          </div>
          <div class="go-row__actions">${chatActions(c)}</div>
        </li>`).join('')}</ul></section>` : ''}

    <div class="gm-term gm-blink" dir="ltr" lang="en"><span class="gm-prompt">$</span> geekorbit --accounts ${accounts.length} --open ${open.length} --stale ${stale.length}<i class="gm-cursor"></i></div>`;
}
