import * as vscode from 'vscode';
import * as fs from 'fs';
import { logError } from '../logger';
import type { WorklogStoreHandle } from '../storeHandle';
import { exportSummary } from '../export';
import { parseDays, parseJsonArg } from './argParsers';

interface ExportSummaryArgs {
  format?: 'json' | 'csv';
  path?: string;
  days?: number;
}

export function registerExportSummaryCommand(storeReady: Promise<WorklogStoreHandle>): vscode.Disposable {
  return vscode.commands.registerCommand('worklog.exportSummary', async (args?: unknown) => {
    try {
      const handle = await storeReady;
      const { format, path: outputPath, days } = parseArgs(args);
      const filePath = outputPath ?? await chooseSavePath(format);
      if (!filePath) {
        return;
      }
      const summary = handle.store.dailySummary(days);
      const inferredFormat = filePath.toLowerCase().endsWith('.csv') ? 'csv' : format;
      const content = exportSummary(summary, { format: inferredFormat });
      fs.writeFileSync(filePath, content, 'utf8');
      vscode.window.showInformationMessage(`Exported summary to ${filePath}`);
    } catch (err) {
      logError('worklog.exportSummary failed', err);
      throw err;
    }
  });
}

function parseArgs(args: unknown): { format: 'json' | 'csv'; path?: string; days: number } {
  if (!args) {
    return { format: 'json', days: 7 };
  }
  const parsed = parseJsonArg<Partial<ExportSummaryArgs>>(args);
  return {
    format: parsed.format === 'csv' ? 'csv' : 'json',
    path: typeof parsed.path === 'string' ? parsed.path : undefined,
    days: parsed.days !== undefined ? parseDays(parsed.days) : 7,
  };
}

async function chooseSavePath(format: 'json' | 'csv'): Promise<string | undefined> {
  const defaultName = `worklog-summary.${format}`;
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
