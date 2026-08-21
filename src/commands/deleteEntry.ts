import * as vscode from 'vscode';
import { logError } from '../logger';
import type { WorklogStoreHandle } from '../storeHandle';
import { parseDeleteArgs, taskFromItem } from './commandUtils';

export function registerDeleteEntryCommand(storeReady: Promise<WorklogStoreHandle>): vscode.Disposable {
  return vscode.commands.registerCommand('worklog.deleteEntry', async (args?: unknown) => {
    try {
      const handle = await storeReady;
      const id = parseDeleteArgs(args);
      if (id !== undefined) {
        handle.store.deleteTask(id);
        handle.treeProvider.refresh();
        return;
      }
      const task = await taskFromItem(args as vscode.TreeItem | undefined, handle.store);
      if (!task) {
        return;
      }
      const confirmed = await vscode.window.showWarningMessage(
        `Delete "${task.title}"?`,
        { modal: true },
        'Delete'
      );
      if (confirmed !== 'Delete') {
        return;
      }
      handle.store.deleteTask(task.id);
      handle.treeProvider.refresh();
    } catch (err) {
      logError('worklog.deleteEntry failed', err);
      throw err;
    }
  });
}
