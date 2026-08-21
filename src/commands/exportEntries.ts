import * as vscode from 'vscode';
import * as fs from 'fs';
import { logError } from '../logger';
import type { WorklogStoreHandle } from '../storeHandle';
import { exportEntries } from '../export';
import { parseJsonArg } from './argParsers';

interface ExportEntriesArgs {
  format?: 'json' | 'csv';
  path?: string;
}

export function registerExportEntriesCommand(storeReady: Promise<WorklogStoreHandle>): vscode.Disposable {
  return vscode.commands.registerCommand('worklog.exportEntries', async (args?: unknown) => {
    try {
      const handle = await storeReady;
      const { format, path: outputPath } = parseArgs(args);
      const filePath = outputPath ?? await chooseSavePath(format);
      if (!filePath) {
        return;
      }
      const entries = handle.store.listTasks();
      const inferredFormat = filePath.toLowerCase().endsWith('.csv') ? 'csv' : format;
      const content = exportEntries(entries, { format: inferredFormat });
      fs.writeFileSync(filePath, content, 'utf8');
      vscode.window.showInformationMessage(`Exported ${entries.length} entries to ${filePath}`);
    } catch (err) {
      logError('worklog.exportEntries failed', err);
      throw err;
    }
  });
}

function parseArgs(args: unknown): { format: 'json' | 'csv'; path?: string } {
  if (!args) {
    return { format: 'json' };
  }
  const parsed = parseJsonArg<Partial<ExportEntriesArgs>>(args);
  const format = parsed.format === 'csv' ? 'csv' : 'json';
  return { format, path: typeof parsed.path === 'string' ? parsed.path : undefined };
}

async function chooseSavePath(format: 'json' | 'csv'): Promise<string | undefined> {
  const defaultName = `worklog-entries.${format}`;
  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(defaultName),
    filters: {
      'JSON files': ['json'],
      'CSV files': ['csv'],
      'All files': ['*'],
    },
  });
  return uri?.fsPath;
}
