// GeekOrbit · install as an app (PWA) and offline updates.
//
// Install card: shown once, on the first visit, on every browser that can install a site.
//   Chrome, Edge, Android and Samsung Internet fire "beforeinstallprompt": the card's button opens the browser's own prompt.
//   Everywhere else the card shows the steps for this device (iPhone and iPad, Android menu, Mac Safari, desktop Chrome or Edge).
//   Firefox on the desktop cannot install sites: nothing is shown there.
// After the first visit, the "Install" link in the footer stays while the app is not installed.
//
// Updates: a new version is cached in the background; a toast offers "reload". Reloading never loses data
// in file mode (every change is already written to the file); in download mode the app warns first.

import { icon, openDialog } from './ui.js';
import * as db from './db.js';

const SEEN_KEY = 'geekorbit-install-seen';
const ua = navigator.userAgent;
const IS_IOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_ANDROID = /Android/i.test(ua);
const IS_MAC_SAFARI = !IS_IOS && /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);
const IS_FIREFOX_DESKTOP = /Firefox/.test(ua) && !IS_ANDROID;

let deferred = null;
let card = null;

const installed = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const canInstall = () => !installed() && (deferred || IS_IOS || IS_ANDROID || !IS_FIREFOX_DESKTOP);
const seen = () => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return true; } };
const markSeen = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ } };

function syncFooterLink() {
  const b = document.getElementById('installLink');
  if (b) b.hidden = !canInstall();
}

function closeCard() {
  if (!card) return;
  const c = card;
  card = null;
  c.classList.remove('is-in');
  setTimeout(() => c.remove(), 250);
}

function openCard() {
  if (card || !canInstall()) return;
  if (document.querySelector('dialog[open]')) { setTimeout(openCard, 4000); return; }   // never on top of a dialog
  markSeen();
  card = document.createElement('section');
  card.className = 'go-install';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-labelledby', 'go-install-t');
  card.innerHTML = `
    <img class="go-install__icon" src="assets/icons/geekorbit-icon.svg" alt="" width="44" height="44">
    <div class="go-install__body">
      <h2 id="go-install-t">نصب <bdi>GeekOrbit</bdi></h2>
      <p>مثل یک برنامه، جدا از مرورگر و تمام‌صفحه باز می‌شود و بدون اینترنت هم کار می‌کند. داده‌ها مثل قبل در فایل خودتان می‌مانند.</p>
      <div class="go-install__actions">
        <button type="button" class="gm-btn gm-btn--primary" data-install-go>${icon(deferred ? 'download' : 'phone')}<span>${deferred ? 'نصب' : 'چطور؟'}</span></button>
        <button type="button" class="gm-btn gm-btn--secondary" data-install-later>بعداً</button>
      </div>
    </div>
    <button type="button" class="go-iconbtn go-install__x" data-install-later aria-label="بستن">${icon('x-lg')}</button>`;
  document.body.appendChild(card);
  requestAnimationFrame(() => requestAnimationFrame(() => card && card.classList.add('is-in')));
  card.addEventListener('click', (e) => {
    if (e.target.closest('[data-install-go]')) { closeCard(); runInstall(); }
    else if (e.target.closest('[data-install-later]')) closeCard();
  });
  card.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCard(); });
}

/** The browser's own prompt when it offers one, otherwise the steps for this device. */
export async function runInstall() {
  if (deferred) {
    const p = deferred;
    deferred = null;
    p.prompt();
    await p.userChoice.catch(() => null);
    syncFooterLink();
    return;
  }
  let title, steps;
  if (IS_IOS) {
    title = 'نصب روی آیفون و آیپد';
    steps = [
      `در نوار مرورگر (<bdi>Safari</bdi> یا <bdi>Chrome</bdi>) دکمه‌ی اشتراک‌گذاری ${icon('box-arrow-up')} را بزنید.`,
      `گزینه‌ی «<bdi>Add to Home Screen</bdi>» ${icon('plus-square')} را انتخاب کنید.`,
      'بالای صفحه «<bdi>Add</bdi>» را بزنید.'];
  } else if (IS_ANDROID) {
    title = 'نصب روی اندروید';
    steps = [
      'منوی مرورگر (سه نقطه) را باز کنید.',
      'گزینه‌ی «<bdi>Install app</bdi>» یا «<bdi>Add to Home screen</bdi>» را بزنید.',
      'تأیید کنید.'];
  } else if (IS_MAC_SAFARI) {
    title = 'نصب روی مک';
    steps = [
      'از منوی <bdi>File</bdi> گزینه‌ی «<bdi>Add to Dock</bdi>» را بزنید.',
      '«<bdi>Add</bdi>» را بزنید. GeekOrbit در Dock و Launchpad می‌آید.'];
  } else {
    title = 'نصب روی کامپیوتر';
    steps = [
      'در <bdi>Chrome</bdi> یا <bdi>Edge</bdi>، آیکون نصب را در انتهای نوار آدرس بزنید.',
      'اگر آیکون نبود، از منوی مرورگر گزینه‌ی «<bdi>Install GeekOrbit</bdi>» را بزنید.',
      'GeekOrbit در پنجره‌ی خودش باز می‌شود و میان برنامه‌های سیستم هم پیدا می‌شود.'];
  }
  openDialog({
    title,
    body: `<ol class="go-install__steps">${steps.map((s) => `<li>${s}</li>`).join('')}</ol>
      <p class="go-install__note">بعد از نصب، GeekOrbit بدون اینترنت هم باز می‌شود. داده‌ها مثل قبل در فایل <bdi dir="ltr">.sqlite</bdi> خودتان ذخیره می‌شوند.</p>`,
    footer: '<button type="button" class="gm-btn gm-btn--primary" data-dismiss>متوجه شدم</button>',
  });
}

function initInstall() {
  const link = document.getElementById('installLink');
  if (link) link.addEventListener('click', () => runInstall());
  syncFooterLink();
  if (installed()) return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();                        // keep it for our own button
    deferred = e;
    syncFooterLink();
  });
  window.addEventListener('appinstalled', () => { deferred = null; closeCard(); markSeen(); syncFooterLink(); });
  // wait a moment so Chrome can fire beforeinstallprompt first and the card offers the one-tap install
  if (!seen() && canInstall()) setTimeout(openCard, 3000);
}

// ---- offline: service worker and updates ----------------------------------------------

function offerUpdate(worker) {
  const el = document.getElementById('updateBar');
  if (!el) return;
  el.hidden = false;
  el.querySelector('[data-update]').onclick = () => {
    if (db.hasUnsavedChanges && db.hasUnsavedChanges()
      && !confirm('تغییرهای ذخیره‌نشده دارید. پیش از بارگذاری دوباره، نسخه‌ی SQLite را دانلود کنید. با این حال ادامه می‌دهید؟')) return;
    worker.postMessage('SKIP_WAITING');
  };
  el.querySelector('[data-update-later]').onclick = () => { el.hidden = true; };
}

function initServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w);
      });
    });
  }).catch(() => { /* offline support is a bonus; the app works without it */ });
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}

export function initPWA() {
  initServiceWorker();
  initInstall();
}
