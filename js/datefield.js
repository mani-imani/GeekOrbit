// GeekOrbit — Jalali date field and calendar popover.
// The stored value is always an ISO date (YYYY-MM-DD); only the display is Jalali.

import {
  toJalali, toGregorian, jalaliMonthLength, jalaliWeekday,
  JALALI_MONTHS, JALALI_WEEKDAYS, JALALI_WEEKDAYS_SHORT,
} from './jalali.js';
import { esc, fa, fmtDate, parseISO, toISO, todayISO } from './util.js';
import { icon } from './ui.js';

export function dateFieldHTML({ name, label, value = '', clearable = false }) {
  return `
    <div class="go-field">
      <label id="${name}-label" for="${name}">${esc(label)}</label>
      <div class="go-datefield" data-datefield data-clearable="${clearable}">
        <input type="hidden" name="${name}" value="${esc(value)}">
        <button type="button" class="go-input go-datefield__btn" id="${name}" aria-haspopup="dialog" aria-expanded="false"
                aria-labelledby="${name}-label ${name}-value">
          <span id="${name}-value" class="go-datefield__value">${value ? fmtDate(value) : '<span class="gm-muted">انتخاب تاریخ</span>'}</span>
          ${icon('calendar3')}
        </button>
      </div>
    </div>`;
}

export function mountDateFields(root) {
  root.querySelectorAll('[data-datefield]').forEach(bindField);
}

function bindField(wrap) {
  const hidden = wrap.querySelector('input[type=hidden]');
  const button = wrap.querySelector('.go-datefield__btn');
  const valueEl = wrap.querySelector('.go-datefield__value');
  const clearable = wrap.dataset.clearable === 'true';
  const dialog = wrap.closest('dialog');
  let pop = null;
  let view = { jy: 0, jm: 0 };
  let focusISO = '';

  const sync = () => {
    valueEl.innerHTML = hidden.value ? fmtDate(hidden.value) : '<span class="gm-muted">انتخاب تاریخ</span>';
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const setValue = (iso) => { hidden.value = iso; sync(); };

  function close(restoreFocus = true) {
    if (!pop) return;
    pop.remove(); pop = null;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
    window.removeEventListener('resize', closeQuiet);
    if (restoreFocus) button.focus();
  }
  const closeQuiet = () => close(false);
  const outside = (e) => { if (pop && !pop.contains(e.target) && !wrap.contains(e.target)) close(false); };

  function viewFor(iso) {
    const d = parseISO(iso) || parseISO(todayISO());
    const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return { jy: j.jy, jm: j.jm };
  }

  function shiftMonth(delta) {
    let { jy, jm } = view;
    jm += delta;
    while (jm > 12) { jm -= 12; jy += 1; }
    while (jm < 1) { jm += 12; jy -= 1; }
    view = { jy, jm };
  }

  function isoOf(jy, jm, jd) {
    const g = toGregorian(jy, jm, jd);
    return toISO(new Date(g.gy, g.gm - 1, g.gd));
  }

  function draw(keepFocus = false) {
    const { jy, jm } = view;
    const lead = jalaliWeekday(jy, jm, 1);
    const length = jalaliMonthLength(jy, jm);
    const selected = hidden.value;
    const today = todayISO();
    const cells = [];
    for (let i = 0; i < lead; i += 1) cells.push('<span class="go-cal__pad"></span>');
    for (let d = 1; d <= length; d += 1) {
      const iso = isoOf(jy, jm, d);
      const isSel = iso === selected;
      cells.push(`<button type="button" class="go-cal__day${isSel ? ' is-selected' : ''}${iso === today ? ' is-today' : ''}"
        data-iso="${iso}" tabindex="${iso === focusISO ? 0 : -1}" aria-label="${fmtDate(iso)}" aria-pressed="${isSel}">${fa(d)}</button>`);
    }
    pop.innerHTML = `
      <div class="go-cal__head">
        <button type="button" class="go-iconbtn" data-nav="-1" aria-label="ماه قبل">${icon('chevron-right')}</button>
        <strong class="go-cal__title" aria-live="polite">${JALALI_MONTHS[jm - 1]} ${fa(jy)}</strong>
        <button type="button" class="go-iconbtn" data-nav="1" aria-label="ماه بعد">${icon('chevron-left')}</button>
      </div>
      <div class="go-cal__week" aria-hidden="true">${JALALI_WEEKDAYS_SHORT.map((w, i) => `<span title="${JALALI_WEEKDAYS[i]}">${w}</span>`).join('')}</div>
      <div class="go-cal__days">${cells.join('')}</div>
      <div class="go-cal__foot">
        <button type="button" class="gm-btn gm-btn--secondary go-btn--sm" data-today>امروز</button>
        ${clearable ? '<button type="button" class="gm-btn gm-btn--secondary go-btn--sm" data-clear>پاک کردن</button>' : ''}
      </div>`;
    if (keepFocus) pop.querySelector(`[data-iso="${focusISO}"]`)?.focus();
  }

  function place() {
    const rect = button.getBoundingClientRect();
    const width = 288;
    const height = pop.offsetHeight;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6);
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  function open() {
    if (pop) return;
    pop = document.createElement('div');
    pop.className = 'go-cal';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'انتخاب تاریخ');
    wrap.appendChild(pop);
    view = viewFor(hidden.value);
    focusISO = hidden.value || todayISO();
    draw();
    // keep the focus target inside the visible month
    if (!pop.querySelector(`[data-iso="${focusISO}"]`)) {
      focusISO = pop.querySelector('[data-iso]').dataset.iso;
      draw();
    }
    place();
    button.setAttribute('aria-expanded', 'true');
    pop.querySelector(`[data-iso="${focusISO}"]`).focus();
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('resize', closeQuiet);

    pop.addEventListener('click', (e) => {
      const day = e.target.closest('[data-iso]');
      const nav = e.target.closest('[data-nav]');
      if (day) { setValue(day.dataset.iso); close(); return; }
      if (nav) {
        shiftMonth(Number(nav.dataset.nav));
        focusISO = isoOf(view.jy, view.jm, 1);
        draw();
        pop.querySelector(`[data-nav="${nav.dataset.nav}"]`).focus();
        return;
      }
      if (e.target.closest('[data-today]')) { setValue(todayISO()); close(); }
      if (e.target.closest('[data-clear]')) { setValue(''); close(); }
    });

    pop.addEventListener('keydown', (e) => {
      const day = e.target.closest('[data-iso]');
      if (!day) return;
      // Right-to-left grid: the right arrow goes back one day.
      const step = { ArrowRight: -1, ArrowLeft: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (step === undefined && e.key !== 'PageUp' && e.key !== 'PageDown') return;
      e.preventDefault();
      const current = parseISO(day.dataset.iso);
      if (e.key === 'PageUp' || e.key === 'PageDown') {
        shiftMonth(e.key === 'PageUp' ? -1 : 1);
        focusISO = isoOf(view.jy, view.jm, Math.min(toJalali(current.getFullYear(), current.getMonth() + 1, current.getDate()).jd, jalaliMonthLength(view.jy, view.jm)));
      } else {
        current.setDate(current.getDate() + step);
        focusISO = toISO(current);
        view = viewFor(focusISO);
      }
      draw(true);
    });
  }

  button.addEventListener('click', () => (pop ? close() : open()));
  dialog?.addEventListener('cancel', (e) => { if (pop) { e.preventDefault(); close(); } });
  dialog?.querySelector('.go-dialog__body')?.addEventListener('scroll', () => { if (pop) place(); }, { passive: true });

}
