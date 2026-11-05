// GeekOrbit — handoff note: a short text to paste into a fresh chat so work can continue there.

import { getProjects } from './data.js';
import { statusLabel } from './model.js';
import { fmtDate } from './util.js';
import { copyText, toast } from './ui.js';

export function handoffText(chat) {
  const project = getProjects().find((p) => p.id === chat.project_id);
  const lines = [];
  lines.push(project
    ? `ادامه‌ی کار روی پروژه‌ی «${project.name}» (${project.code})`
    : 'ادامه‌ی کار روی یک گفت‌وگوی قبلی');
  if (chat.phase) lines.push(`مرحله: ${chat.phase}`);
  lines.push(`وضعیت: ${statusLabel(chat.status)}`);
  if (chat.summary) lines.push(`خلاصه‌ی تا اینجا: ${chat.summary}`);
  if (chat.next_step) lines.push(`گام بعدی: ${chat.next_step}`);
  if (chat.last_update) lines.push(`آخرین به‌روزرسانی: ${fmtDate(chat.last_update)}`);
  if (chat.chat_link) lines.push(`گفت‌وگوی قبلی: ${chat.chat_link}`);
  lines.push('', 'با همین اطلاعات ادامه بده و اگر چیزی کم بود بپرس.');
  return lines.join('\n');
}

export async function copyHandoff(chat) {
  const ok = await copyText(handoffText(chat));
  toast(ok ? 'یادداشت تحویل کپی شد.' : 'کپی انجام نشد.', { danger: !ok });
}
