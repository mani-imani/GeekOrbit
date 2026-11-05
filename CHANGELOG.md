# Changelog

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
