import * as vscode from 'vscode';
import type { WorklogStoreHandle } from '../storeHandle';
import { parseDays } from './commandUtils';

export function registerGetSummaryCommand(storeReady: Promise<WorklogStoreHandle>): vscode.Disposable {
  return vscode.commands.registerCommand('worklog.getSummary', async (days?: unknown) => {
    const { store } = await storeReady;
    return store.dailySummary(parseDays(days));
  });
}
