import * as vscode from 'vscode';
import { logError } from '../logger';
import type { WorklogStoreHandle } from '../storeHandle';
import { taskFromItem } from './commandUtils';

function formatTaskAsMarkdown(task: import('../types').Task): string {
  const lines: string[] = [];
  lines.push(`# ${task.title}`);
  if (task.summary && task.summary.trim().length > 0) {
    lines.push('', task.summary.trim());
  }
  lines.push('', `- Time spent: ${task.actualMinutes} min`);
  if (task.estimatedMinutes && task.estimatedMinutes > 0) {
    lines.push(`- Estimated: ${task.estimatedMinutes} min`);
  }
  if (task.tags && task.tags.trim().length > 0) {
    lines.push(`- Tags: ${task.tags}`);
  }
  lines.push(`- Created: ${task.createdAt}`);
  lines.push(`- Updated: ${task.updatedAt}`);
  return lines.join('\n');
}

export function registerCopyEntryAsMarkdownCommand(storeReady: Promise<WorklogStoreHandle>): vscode.Disposable {
  return vscode.commands.registerCommand('worklog.copyEntryAsMarkdown', async (args?: unknown) => {
    try {
      const handle = await storeReady;
      const task = await taskFromItem(args as vscode.TreeItem | undefined, handle.store);
      if (!task) {
        return;
      }
      const md = formatTaskAsMarkdown(task);
      await vscode.env.clipboard.writeText(md);
      void vscode.window.showInformationMessage('Worklog entry copied as Markdown');
    } catch (err) {
      logError('worklog.copyEntryAsMarkdown failed', err);
      throw err;
    }
  });
}
