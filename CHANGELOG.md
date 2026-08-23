# Change Log

## [0.1.0]

### Added

- Add, edit, delete, and list worklog entries.
- Daily summaries with total minutes and entry counts.
- Activity Bar tree view grouped by Today, Yesterday, and date.
- Inline edit/delete actions in the tree view.
- Local SQLite storage using `sql.js` (pure JavaScript, no native bindings).
- Workspace-scoped database defaulting to `.vscode/worklog.db`.
- Configurable database path via `worklog.databasePath` setting.
- Programmatic commands for AI assistants (`worklog.addEntry`, `worklog.getEntries`, `worklog.getTodaySummary`, `worklog.getSummary`, `worklog.editEntry`, `worklog.deleteEntry`).
- Optional `estimatedMinutes` field on each entry, separate from `actualMinutes` (time actually spent).
- Support for JSON-string or object arguments from AI command bridges.
- Export entries and daily summaries to JSON or CSV.
