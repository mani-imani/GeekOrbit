# Changelog

## v2.2.3 · Nov 2026
- Installed app on iPhone and iPad: the engine file could not be downloaded at all ("both async and sync fetching of the wasm failed"). The app now has four ways to get it, tried in order: the offline copy, a normal download, a download that skips the service worker, and a copy shipped inside the app as text. If all fail, the message lists why each one failed.

## v2.2.2 · Nov 2026
- Installed app on iPhone and iPad: "new database" and "sample data" did nothing. The SQLite engine was downloaded at the first tap, and in the installed app that download could wait forever. The engine now loads when the app opens, the app reads the engine file itself (from the offline copy first, then the network), and every step has a time limit, so a failure shows an error instead of a button that does nothing.
- The tapped button shows "preparing" while the engine starts.

## v2.2.1 · Nov 2026
- Phones: the install card no longer covers the buttons of the start screen ("new database", "open a file", "sample data"). It now waits until a database is open.
- No accidental zoom on iPhone and iPad: pinch and double-tap zoom are off, and every field is at least 16px on touch screens, so iOS no longer zooms in when a field takes focus.
- iPhone and iPad: "open an existing file" accepts any file in the picker, because iOS greys out the `.sqlite` extension; a wrong file is still refused.
- On phones, a chat's summary, title and next step are stacked instead of squeezed into three columns.
- If creating or opening a database fails for an unknown reason, the message now includes the error text.

## v2.2.0 · Nov 2026
- Install as an app (PWA): a web app manifest, brand icons for the home screen (including a maskable one), and a service worker that keeps the whole app, sql.js included, for offline use. Your data still lives only in your `.sqlite` file.
- Install card on the first visit, on every browser that can install the app: the browser's own prompt where it offers one, otherwise the steps for iPhone and iPad, Android, Mac and desktop Chrome or Edge. Afterwards an "install on this device" link stays in the footer.
- New versions download in the background; a bar offers to reload, and warns first if there are changes not yet downloaded.

## v2.1.0 · Nov 2026
- Online at mani-imani.github.io/GeekOrbit: the app still runs entirely in the browser and saves only to a file on your device.
- "Try it with sample data" on the start screen: four projects, three accounts and five chats in memory; nothing is saved and closing the tab ends it.
- The start screen explains in three lines what GeekOrbit does and where the data stays.

## v2.0.0 · Nov 2026
- New look in the GeekMani product family: `geek.css`, brand icon and wordmark, light and dark themes, full right-to-left layout, local fonts and the "by GeekMani" signature.
- Statuses are stored as stable keys instead of text with emoji; v1 files are upgraded once, after offering a backup. The upgrade creates any missing tables and columns, so every v1 file opens.
- Foreign keys are enforced; deleting a project, account or tag also clears its links.
- Persian (Jalali) dates and a Jalali date picker.
- Chat handoff note, a "continue" list on the dashboard, and stale-chat detection.
- Backup and export (SQLite, JSON, CSV) with a reminder, duplicate-link warning, account limit date and keyboard shortcuts.
- On phones the menu scrolls sideways with a faded edge and keeps the current section in view.

## v1
- First version: accounts, projects and chats in a local SQLite file.
