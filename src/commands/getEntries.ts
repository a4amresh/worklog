import * as vscode from 'vscode';
import type { WorklogStoreHandle } from '../storeHandle';
import { parseJsonArg } from './commandUtils';

export function registerGetEntriesCommand(storeReady: Promise<WorklogStoreHandle>): vscode.Disposable {
  return vscode.commands.registerCommand('worklog.getEntries', async (filter?: unknown) => {
    const { store } = await storeReady;
    if (!filter) {
      return store.listTasks();
    }
    return store.listTasks(parseJsonArg<{ tag?: string; date?: string }>(filter));
  });
}
