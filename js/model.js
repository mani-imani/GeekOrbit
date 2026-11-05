// GeekOrbit — shared vocabulary: statuses, priorities and thresholds.

export const VERSION = 'v2.1.0';
export const STALE_DAYS = 14;    // an active chat untouched this long counts as stale
export const BACKUP_DAYS = 7;    // remind about a backup after this many days

export const STATUSES = [
  { key: 'active', label: 'فعال' },
  { key: 'paused', label: 'معلق' },
  { key: 'blocked', label: 'گیرکرده' },
  { key: 'done', label: 'تمام‌شده' },
  { key: 'idea', label: 'ایده' },
];

export const PRIORITIES = [
  { key: 'P0', label: 'فوری' },
  { key: 'P1', label: 'عادی' },
  { key: 'P2', label: 'کم' },
];

export const statusLabel = (key) => STATUSES.find((s) => s.key === key)?.label ?? key;
export const priorityLabel = (key) => PRIORITIES.find((p) => p.key === key)?.label ?? key;

export const ROUTES = [
  { id: 'dashboard', label: 'داشبورد', icon: 'speedometer2' },
  { id: 'projects', label: 'پروژه‌ها', icon: 'folder2' },
  { id: 'chats', label: 'چت‌ها', icon: 'chat-left-text' },
  { id: 'accounts', label: 'حساب‌ها', icon: 'person-badge' },
  { id: 'tags', label: 'برچسب‌ها', icon: 'tags' },
  { id: 'changelog', label: 'تغییرات', icon: 'clock-history' },
];
