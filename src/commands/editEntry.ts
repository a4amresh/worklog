import * as vscode from 'vscode';
import { logError } from '../logger';
import type { WorklogStoreHandle } from '../storeHandle';
import { parseEditEntryArgs, promptTaskFields, taskFromItem } from './commandUtils';

export function registerEditEntryCommand(storeReady: Promise<WorklogStoreHandle>): vscode.Disposable {
  return vscode.commands.registerCommand('worklog.editEntry', async (args?: unknown) => {
    try {
      const handle = await storeReady;
      const editArgs = parseEditEntryArgs(args);
      if (editArgs) {
        handle.store.updateTask(editArgs.id, editArgs);
        handle.treeProvider.refresh();
        return;
      }
      const task = await taskFromItem(args as vscode.TreeItem | undefined, handle.store);
      if (!task) {
        return;
      }
      const fields = await promptTaskFields({
        title: task.title,
        summary: task.summary,
        timeMinutes: task.timeMinutes,
        tags: task.tags,
      });
      if (!fields) {
        return;
      }
      handle.store.updateTask(task.id, fields);
      handle.treeProvider.refresh();
    } catch (err) {
      logError('worklog.editEntry failed', err);
      throw err;
    }
  });
}
