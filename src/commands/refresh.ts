import * as vscode from 'vscode';
import type { WorklogStoreHandle } from '../storeHandle';

export function registerRefreshCommand(storeReady: Promise<WorklogStoreHandle>): vscode.Disposable {
  return vscode.commands.registerCommand('worklog.refresh', async () => {
    const { treeProvider } = await storeReady;
    treeProvider.refresh();
  });
}
