// GeekOrbit — sample data for the "try it" mode on the start screen.
// Runs on an in-memory database: nothing is written to disk, and closing the tab ends it.

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** `run(sql, params)` executes one statement; called inside a transaction. */
export function fillDemo(run) {
  const accounts = [
    ['Claude · Personal', 'کدنویسی و طراحی', ''],
    ['Claude · Work', 'پروژه‌های مشتری', day(-2)],   // limited until two days from now
    ['ChatGPT', 'نوشتن و ترجمه', ''],
  ];
  accounts.forEach(([name, role, limited]) =>
    run('INSERT INTO accounts (name, role, note, limited_until) VALUES (?,?,?,?)', [name, role, '', limited]));

  const projects = [
    ['P01', 'سایت شخصی', 'نمونه‌کار و رزومه، دوزبانه', 'active', 'P0', 70, day(30), day(1)],
    ['P02', 'افزونه‌ی مرورگر', 'نسخه‌ی دوم با ظاهر تازه', 'active', 'P1', 40, day(20), day(3)],
    ['P03', 'ربات تلگرام', 'یادآوری کلاس‌ها برای دانشجوها', 'paused', 'P2', 15, day(60), day(25)],
    ['P04', 'اپ یادداشت', 'فعلاً فقط یک ایده', 'idea', 'P2', 0, '', ''],
  ];
  projects.forEach((p) => run(
    'INSERT INTO projects (code, name, description, status, priority, progress, start_date, last_activity) VALUES (?,?,?,?,?,?,?,?)', p));
  [[1, 1], [1, 3], [2, 1], [2, 2], [3, 2], [4, 3]].forEach((r) =>
    run('INSERT INTO project_accounts (project_id, account_id) VALUES (?,?)', r));

  ['وب', 'ابزار', 'پایتون'].forEach((t) => run('INSERT INTO tags (name) VALUES (?)', [t]));
  [[1, 1], [2, 1], [2, 2], [3, 3]].forEach((r) => run('INSERT INTO project_tags (project_id, tag_id) VALUES (?,?)', r));

  const chats = [
    [1, 'طراحی صفحه‌ی اصلی', 1, 'https://claude.ai/chat/sample-1', 'ساختار صفحه و رنگ‌ها نهایی شد.', 'active', day(9), day(1), 'نوشتن متن بخش درباره'],
    [1, 'متن انگلیسی', 3, 'https://chatgpt.com/c/sample-2', 'ترجمه‌ی بخش‌های اصلی.', 'active', day(6), day(2), 'بازبینی عنوان‌ها'],
    [2, 'پاپ‌آپ تازه', 2, 'https://claude.ai/chat/sample-3', 'کلید روشن و خاموش و پوسته اضافه شد.', 'active', day(12), day(3), 'آزمودن روی چند سایت'],
    [3, 'زمان‌بندی پیام‌ها', 2, 'https://claude.ai/chat/sample-4', 'منطق یادآوری نیمه‌کاره ماند.', 'blocked', day(40), day(25), 'انتخاب کتابخانه‌ی زمان‌بندی'],
    [2, 'نسخه‌ی اول', 1, 'https://claude.ai/chat/sample-5', 'منتشر شد.', 'done', day(80), day(70), ''],
  ];
  chats.forEach((c) => run(
    'INSERT INTO chat_log (project_id, phase, account_id, chat_link, summary, status, start_date, last_update, next_step) VALUES (?,?,?,?,?,?,?,?,?)', c));

  run('INSERT INTO changelog (date, description) VALUES (?, ?)', [day(0), 'پایگاه داده‌ی نمونه ساخته شد.']);
}
