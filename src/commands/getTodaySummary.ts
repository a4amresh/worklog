import * as vscode from 'vscode';
import type { WorklogStoreHandle } from '../storeHandle';
import { todaySummary } from './commandUtils';

export function registerGetTodaySummaryCommand(storeReady: Promise<WorklogStoreHandle>): vscode.Disposable {
  return vscode.commands.registerCommand('worklog.getTodaySummary', async () => {
    const { store } = await storeReady;
    return todaySummary(store);
  });
}
