# Worklog

A local-first VS Code extension for keeping your own lightweight history of
development work directly inside your workspace.

Worklog is **developer-owned task logging**, not a tracking or surveillance tool.
You decide what to log, when to log it, and what to do with the data. AI coding
assistants can help add entries and generate standup notes from your local
worklog — but nothing is recorded automatically.

## Features

- **Local SQLite storage** — entries are stored in `.vscode/worklog.db` by
  default, so your worklog travels with the project. No cloud or external service
  required.
- **Pure-JavaScript SQLite via `sql.js`** — no native bindings, no rebuilds,
  works out of the box across VS Code versions.
- **Activity Bar tree view** — entries grouped by Today, Yesterday, and earlier
  dates.
- **Inline actions** — edit and delete entries from the tree view.
- **Daily summaries** — total actual time and entry count per day.
- **AI assistant friendly** — commands accept arguments programmatically, so your
  AI coding assistant can add entries and generate standup notes from your local
  data without opening UI prompts.
- **Export** — dump entries or daily summaries to JSON or CSV.

## Requirements

- VS Code 1.90+
- Node.js 18+ (for development)

## Installation

Install from the VS Code Marketplace (search for **Worklog**) or install the
`.vsix` manually:

```bash
code --install-extension worklog-0.1.0.vsix
```

## Usage

Open the **Worklog** panel in the Explorer sidebar. Click the **+** icon to add
an entry, or right-click an existing entry to edit or delete it.

When adding an entry you can record:

- **Title** — short description of the work
- **Summary** — optional longer notes
- **Actual minutes** — time you actually spent
- **Estimated minutes** — optional planned/estimated time
- **Tags** — optional comma-separated labels

## AI Assistant Integration

The same commands that power the UI also accept arguments when invoked
programmatically, so they never open prompts for AI assistants.

```js
// Add a worklog entry (no UI prompts)
const entry = await vscode.commands.executeCommand('worklog.addEntry', {
  title: 'Refactor auth service',
  summary: 'Extracted token validation into middleware',
  actualMinutes: 45,
  estimatedMinutes: 30,
  tags: 'refactor,auth'
});

// Get recent entries
const entries = await vscode.commands.executeCommand('worklog.getEntries');

// Get entries for a specific date or tag
const tagged = await vscode.commands.executeCommand('worklog.getEntries', { tag: 'auth' });

// Get today's total time and count
const today = await vscode.commands.executeCommand('worklog.getTodaySummary');

// Get daily summaries for the last 7 days
const summary = await vscode.commands.executeCommand('worklog.getSummary', 7);

// Update an entry by id
await vscode.commands.executeCommand('worklog.editEntry', {
  id: entry.id,
  title: 'Refactor auth service and add tests',
  actualMinutes: 60,
  estimatedMinutes: 45
});

// Delete an entry by id
await vscode.commands.executeCommand('worklog.deleteEntry', { id: entry.id });
// or
await vscode.commands.executeCommand('worklog.deleteEntry', entry.id);

// Export all entries to JSON or CSV (path optional; opens save dialog if omitted)
await vscode.commands.executeCommand('worklog.exportEntries', { format: 'json', path: '/tmp/worklog.json' });
await vscode.commands.executeCommand('worklog.exportEntries', { format: 'csv' });

// Export daily summary to JSON or CSV
await vscode.commands.executeCommand('worklog.exportSummary', { format: 'csv', days: 30 });
```

## Development

```bash
npm install
npm run compile       # compile TypeScript for development
npm test              # run unit tests
npm run lint          # run ESLint
```

Press `F5` to open an Extension Development Host window with Worklog loaded.

## Production build

`vsce package` automatically runs the `vscode:prepublish` script, which bundles
extension JS with esbuild in production mode and then produces the `.vsix`:

```bash
npx vsce package   # bundle + build worklog-0.1.0.vsix
```

If you only want to bundle without creating the `.vsix`:

```bash
npm run vscode:prepublish
```

## Extension Settings

| Setting | Description |
| ------- | ----------- |
| `worklog.databasePath` | Path to the SQLite database. Empty defaults to `.vscode/worklog.db` inside the workspace. |

## License

MIT
