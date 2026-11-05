// GeekOrbit — small shared helpers: escaping, Persian numbers and dates, URLs.

import { toJalali, JALALI_MONTHS } from './jalali.js';

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** User-written text inside Persian UI: isolate its direction. */
export const u = (value) => `<bdi>${esc(value)}</bdi>`;

const faNumber = new Intl.NumberFormat('fa-IR', { useGrouping: false });
/** Persian digits for counts and dates. */
export const fa = (n) => faNumber.format(n);

const pad = (n) => String(n).padStart(2, '0');

/** Today as YYYY-MM-DD in the local time zone (not UTC). */
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export function toISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Whole days from `iso` to today. Positive = in the past. */
export function daysSince(iso) {
  const then = parseISO(iso);
  if (!then) return null;
  return Math.round((parseISO(todayISO()) - then) / 86400000);
}

/** «۱۴ آبان ۱۴۰۵» */
export function fmtDate(iso, { year = true } = {}) {
  const d = parseISO(iso);
  if (!d) return '—';
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${fa(j.jd)} ${JALALI_MONTHS[j.jm - 1]}${year ? ` ${fa(j.jy)}` : ''}`;
}

/** «امروز»، «دیروز»، «۳ روز پیش»، «۲ هفته پیش»… */
export function relDays(iso) {
  const n = daysSince(iso);
  if (n === null) return '—';
  if (n < 0) return `${fa(-n)} روز دیگر`;
  if (n === 0) return 'امروز';
  if (n === 1) return 'دیروز';
  if (n < 14) return `${fa(n)} روز پیش`;
  if (n < 60) return `${fa(Math.floor(n / 7))} هفته پیش`;
  if (n < 365) return `${fa(Math.floor(n / 30))} ماه پیش`;
  return `${fa(Math.floor(n / 365))} سال پیش`;
}

/** Normalise a chat URL so the same chat compares equal. */
export function normalizeUrl(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    url.hash = '';
    [...url.searchParams.keys()].forEach((k) => { if (/^utm_/i.test(k)) url.searchParams.delete(k); });
    const path = url.pathname.replace(/\/+$/, '');
    return `${url.protocol}//${url.host.toLowerCase()}${path}${url.search}`;
  } catch {
    return text.toLowerCase().replace(/\/+$/, '');
  }
}

export function isSafeUrl(raw) {
  try {
    const url = new URL(String(raw || '').trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
