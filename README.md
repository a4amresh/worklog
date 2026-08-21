# Worklog

A local-first VS Code extension for managing tasks and keeping a lightweight
history of development work directly inside your workspace.

## Features

- **Local-first SQLite storage** — worklog entries live in `.vscode/worklog.db`
  (or a path you configure) and travel with the project.
- **Pure-JavaScript SQLite via `sql.js`** — no native bindings or rebuilds needed.
- **Activity Bar tree view** — entries grouped by Today, Yesterday, and date.
- **Inline actions** — edit and delete entries from the tree view.
- **Daily summaries** — total time and entry count per day.

## Requirements

- VS Code 1.90+
- Node.js 18+

## Getting Started

```bash
npm install
npm run esbuild        # bundle extension JS into out/extension.js
```

## Running in VS Code

Press `F5` (Run Extension) to open a new Extension Development Host window with
Worklog loaded.

## Tests

```bash
npm test
```

## AI Assistant Integration

Worklog exposes commands that AI coding assistants can invoke directly from the
VS Code extension host to read and write worklog entries.

### Programmatic use by AI assistants

The same commands that power the UI also accept arguments when invoked
programmatically, so they never open prompts for AI assistants.

```js
// Add a worklog entry (no UI prompts)
const entry = await vscode.commands.executeCommand('worklog.addEntry', {
  title: 'Refactor auth service',
  summary: 'Extracted token validation into middleware',
  timeMinutes: 45,
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
  timeMinutes: 60
});

// Delete an entry by id
await vscode.commands.executeCommand('worklog.deleteEntry', { id: entry.id });
// or
await vscode.commands.executeCommand('worklog.deleteEntry', entry.id);
```

## Packaging

```bash
npm run package
```

## Extension Settings

| Setting | Description |
| ------- | ----------- |
| `worklog.databasePath` | Path to the SQLite database. Empty defaults to `.vscode/worklog.db` inside the workspace. |

## Troubleshooting

### "There is no data provider registered that can provide view data"

This means the Worklog extension failed to activate. Try:

1. Reload the Extension Development Host window (`Cmd/Ctrl + R`).
2. Check **Output → Extension Host** for errors.
3. Make sure you built the extension before launching:
   ```bash
   npm run compile
   ```

## License

MIT
