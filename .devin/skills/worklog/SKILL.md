# Worklog

Worklog is a local-first VS Code extension for tracking development work. It is installed in the current workspace under the extension ID `a4amresh.worklog`.

## When to use

Use Worklog whenever you finish a meaningful unit of work, switch tasks, or wrap up a session. Recording entries creates a lightweight, searchable history tied to the project.

## Important: use command IDs, not display titles

Worklog registers commands under stable IDs. Always invoke these exact IDs — do not use the human-readable titles shown in menus.

## Quick health check

If Worklog commands fail, first test that the extension is reachable by invoking a read-only command:

```js
await vscode.commands.executeCommand('worklog.getTodaySummary');
// Expected: { date: '...', totalMinutes: 0, entryCount: 0 } or undefined if no entries yet
```

If that fails, the extension is not installed or not activated in the active VS Code window. Check **Output → Worklog** for diagnostic messages.

## How to add an entry

Call the VS Code command ID `worklog.addEntry` with a JSON argument object:

```json
{
  "title": "Short title of the work",
  "summary": "Optional longer description",
  "actualMinutes": 30,
  "tags": "comma,separated,tags"
}
```

Required fields:
- `title` (string)

Optional fields:
- `summary` (string)
- `actualMinutes` (non-negative integer) — actual time spent
- `estimatedMinutes` (non-negative integer) — estimated/planned time
- `tags` (string, comma-separated)

Example invocation from an agent:

```js
await vscode.commands.executeCommand('worklog.addEntry', {
  title: 'Refactor auth middleware',
  summary: 'Extracted JWT validation into reusable middleware and added tests',
  actualMinutes: 45,
  estimatedMinutes: 30,
  tags: 'refactor,auth,tests'
});
```

## How to read entries

- `worklog.getEntries` — returns an array of recent worklog entries.
- `worklog.getEntries({ tag: 'auth' })` — filters by tag substring.
- `worklog.getEntries({ date: '2026-08-22' })` — filters by local date.
- `worklog.getTodaySummary` — returns today's total minutes and entry count.
- `worklog.getSummary(days)` — returns daily summaries for the last N days.

## How to update or delete an entry

Use `worklog.editEntry` with the entry `id` and the fields to change:

```js
await vscode.commands.executeCommand('worklog.editEntry', {
  id: 1,
  title: 'Updated title',
  summary: 'Updated summary',
  actualMinutes: 60,
  tags: 'refactor,auth'
});
```

Use `worklog.deleteEntry` with the entry `id`:

```js
await vscode.commands.executeCommand('worklog.deleteEntry', { id: 1 });
// or
await vscode.commands.executeCommand('worklog.deleteEntry', 1);
```

## How to export data

- `worklog.exportEntries({ format: 'json', path: '/path/to/file.json' })` — exports all entries as JSON.
- `worklog.exportEntries({ format: 'csv' })` — opens a save dialog and exports entries as CSV.
- `worklog.exportSummary({ format: 'csv', days: 30 })` — exports daily summaries for the last 30 days.

If `path` is omitted, the command opens a save dialog.

## Guidelines

- Add entries after completing a discrete chunk of work, not before.
- Keep titles short and specific.
- Use tags consistently (e.g., `bugfix`, `feature`, `refactor`, `docs`, `tests`).
- Record `actualMinutes` honestly; partial minutes are fine.
- Do not delete entries unless they were created by mistake.
