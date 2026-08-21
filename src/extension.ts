import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { WorklogStore } from './store';
import { WorklogTreeProvider } from './treeProvider';
import { registerCommands } from './commands';
import type { WorklogStoreHandle } from './storeHandle';

export function activate(context: vscode.ExtensionContext): void {
  const treeProvider = new WorklogTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('worklog', treeProvider)
  );

  const dbPath = resolveDatabasePath(context);
  ensureDirectory(path.dirname(dbPath));
  const store = new WorklogStore({ dbPath });

  const storeReady = store.init()
    .then(() => {
      treeProvider.setStore(store);
      return { store, treeProvider };
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`Worklog failed to activate: ${message}`);
      throw err;
    });

  context.subscriptions.push(
    ...registerCommands(storeReady),
    { dispose: () => store.close() }
  );
}

function ensureDirectory(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function resolveDatabasePath(context: vscode.ExtensionContext): string {
  const configured = vscode.workspace.getConfiguration('worklog').get<string>('databasePath');
  if (configured && configured.trim().length > 0) {
    return configured;
  }
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    const vscodeDir = path.join(workspaceFolder.uri.fsPath, '.vscode');
    return path.join(vscodeDir, 'worklog.db');
  }
  return path.join(context.globalStorageUri.fsPath, 'worklog.db');
}

export function deactivate(): void {
  // cleanup handled by context.subscriptions
}
