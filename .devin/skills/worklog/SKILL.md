# Worklog

Help the developer log development tasks, review recent work, and generate
standup notes using the local-first Worklog VS Code extension
(`a4amresh.worklog`).

All worklog data stays in the workspace. Do not log anything without the
developer's input or confirmation.

## When to use

Offer to use Worklog when the developer:

- Finishes work and says something like "log this", "track this", or "I did X"
- Asks what they worked on today, this week, or recently
- Wants standup notes or a retrospective summary
- Wants to compare actual time spent vs their estimate

## Commands

Always use these exact command IDs. Pass arguments as objects or JSON strings.

### Add an entry

```js
await vscode.commands.executeCommand('worklog.addEntry', {
  title: 'Refactor auth middleware',
  summary: 'Extracted JWT validation into middleware and added tests',
  actualMinutes: 45,      // actual time spent, whole number ≥ 0
  estimatedMinutes: 30,   // optional estimate, whole number ≥ 0
  tags: 'refactor,auth,tests'
});
```

Required: `title`.
Optional: `summary`, `actualMinutes`, `estimatedMinutes`, `tags`.

Map informal input yourself. Example:
- "log 45 min on auth refactor" → `title: 'Auth refactor', actualMinutes: 45`

### Read entries

```js
await vscode.commands.executeCommand('worklog.getEntries');
await vscode.commands.executeCommand('worklog.getEntries', { tag: 'auth' });
await vscode.commands.executeCommand('worklog.getEntries', { date: '2026-08-22' });
await vscode.commands.executeCommand('worklog.getTodaySummary');
await vscode.commands.executeCommand('worklog.getSummary', 7); // defaults to 7 days
```

### Update or delete

```js
await vscode.commands.executeCommand('worklog.editEntry', {
  id: 1,
  title: 'Updated title',
  summary: 'Updated summary',
  actualMinutes: 60,
  estimatedMinutes: 45,
  tags: 'refactor,auth'
});

await vscode.commands.executeCommand('worklog.deleteEntry', { id: 1 });
// or
await vscode.commands.executeCommand('worklog.deleteEntry', 1);
```

### Export

```js
await vscode.commands.executeCommand('worklog.exportEntries', { format: 'json', path: '/path/to/file.json' });
await vscode.commands.executeCommand('worklog.exportSummary', { format: 'csv', days: 30 });
```

## Generating standup notes and summaries

Worklog only stores raw data. You generate human-readable summaries and insights
by reading entries and summaries with the commands above.

Example analysis:

> "This week you logged 12h across 18 entries. You estimated 9h, so actual time
> was 33% higher than estimated. Tasks tagged `refactor` were most underestimated."

## Guidelines

- Confirm before creating, updating, or deleting entries unless the developer explicitly asked.
- Keep titles short and specific.
- Use tags consistently (`bugfix`, `feature`, `refactor`, `docs`, `tests`).
- Record `actualMinutes` and `estimatedMinutes` as whole numbers ≥ 0.
- Do not send Worklog data to external services.
