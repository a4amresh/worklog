# Change Log

## [0.1.0] - 2026-08-23

### Added

- Add, edit, delete, and list worklog entries.
- Activity Bar tree view grouped by Today, Yesterday, and earlier dates.
- Inline edit/delete actions in the tree view.
- Daily summaries with total actual time and entry count.
- Optional `estimatedMinutes` field on each entry, separate from `actualMinutes`
  (time actually spent).
- Local SQLite storage using `sql.js` (pure JavaScript, no native bindings).
- Workspace-scoped database defaulting to `.vscode/worklog.db`.
- Configurable database path via `worklog.databasePath` setting.
- Programmatic commands for AI assistants: `worklog.addEntry`,
  `worklog.getEntries`, `worklog.getTodaySummary`, `worklog.getSummary`,
  `worklog.editEntry`, `worklog.deleteEntry`.
- Support for both object and JSON-string arguments from AI command bridges.
- Export entries and daily summaries to JSON or CSV.
