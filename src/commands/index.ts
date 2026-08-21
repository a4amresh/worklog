import * as vscode from 'vscode';
import type { WorklogStoreHandle } from '../storeHandle';
import { registerAddEntryCommand } from './addEntry';
import { registerEditEntryCommand } from './editEntry';
import { registerDeleteEntryCommand } from './deleteEntry';
import { registerGetEntriesCommand } from './getEntries';
import { registerGetTodaySummaryCommand } from './getTodaySummary';
import { registerGetSummaryCommand } from './getSummary';
import { registerRefreshCommand } from './refresh';

export { AddEntryArgs, EditEntryArgs } from './commandUtils';

export function registerCommands(storeReady: Promise<WorklogStoreHandle>): vscode.Disposable[] {
  return [
    registerAddEntryCommand(storeReady),
    registerEditEntryCommand(storeReady),
    registerDeleteEntryCommand(storeReady),
    registerGetEntriesCommand(storeReady),
    registerGetTodaySummaryCommand(storeReady),
    registerGetSummaryCommand(storeReady),
    registerRefreshCommand(storeReady),
  ];
}
