# Fitness Buddy (mobile web app)

Offline-first PWA for following a training program at the gym, logging sets, and logging daily nutrition.

- **No personal data in this repository.** The program is imported on the phone from a private JSON file,
  and all logs are stored only in the phone's browser storage (localStorage).
- Tabs: Today (session by date, logging, rest timer, exercise guide), Plan (12 weeks), Food (targets, water,
  meals, checklist), Progress (lifts, weight trend, weekly readiness, baseline tests), More (language EN/VI,
  backup/restore, training maxes).
- Backups are JSON files exported from the app (More → Share/Export backup) and merged into the Excel
  workbook on the PC with `Tools/import_owp12_app_backup.py`.

Static site, no build step. Serve the folder over HTTPS (e.g. GitHub Pages).
After changing any file, bump `VERSION` in `sw.js` so phones pick up the update.
