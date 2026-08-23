import * as vscode from 'vscode';
import { WorklogStore } from '../store';
import { WorklogTreeProvider } from '../treeProvider';
import { localDateString } from '../dateUtil';
import type { Task, DailySummary } from '../types';

export type { AddEntryArgs, EditEntryArgs, TaskFields } from './argParsers';

export interface TreeTaskItem extends vscode.TreeItem {
  task?: Task;
}

export interface TaskQuickPickItem extends vscode.QuickPickItem {
  task: Task;
}

export async function taskFromItem(
  item: vscode.TreeItem | undefined,
  store: WorklogStore
): Promise<Task | undefined> {
  const taskItem = item as TreeTaskItem | undefined;
  if (taskItem?.task) {
    return taskItem.task;
  }

  const tasks = store.listTasks();
  if (tasks.length === 0) {
    vscode.window.showInformationMessage('No worklog entries found.');
    return undefined;
  }
  const pick = await vscode.window.showQuickPick<TaskQuickPickItem>(
    tasks.map(t => ({ label: t.title, description: `${t.actualMinutes} min`, task: t })),
    { placeHolder: 'Select a worklog entry' }
  );
  return pick?.task;
}

export async function promptTaskFields(defaults?: Partial<import('./argParsers').TaskFields>): Promise<import('./argParsers').TaskFields | undefined> {
  const title = await vscode.window.showInputBox({
    prompt: 'Worklog entry title',
    value: defaults?.title,
    validateInput: (value) => value?.trim() ? undefined : 'Title is required',
  });
  if (!title || title.trim().length === 0) {
    return undefined;
  }

  const summary = await vscode.window.showInputBox({
    prompt: 'Summary (optional)',
    value: defaults?.summary,
  }) ?? '';

  const timeInput = await vscode.window.showInputBox({
    prompt: 'Time spent in minutes',
    value: defaults?.actualMinutes?.toString() ?? '',
    validateInput: (value) => {
      const n = Number(value);
      return Number.isInteger(n) && n >= 0 ? undefined : 'Enter a positive whole number';
    },
  });
  if (timeInput === undefined || timeInput.trim().length === 0) {
    return undefined;
  }
  const actualMinutes = Number(timeInput);

  const estimatedInput = await vscode.window.showInputBox({
    prompt: 'Estimated time in minutes (optional)',
    value: defaults?.estimatedMinutes?.toString() ?? '',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return undefined;
      }
      const n = Number(value);
      return Number.isInteger(n) && n >= 0 ? undefined : 'Enter a positive whole number';
    },
  });
  const estimatedMinutes = estimatedInput?.trim() ? Number(estimatedInput.trim()) : 0;

  const tags = await vscode.window.showInputBox({
    prompt: 'Tags (optional, comma-separated)',
    value: defaults?.tags,
  }) ?? '';

  return { title: title.trim(), summary: summary.trim(), actualMinutes, estimatedMinutes, tags: tags.trim() };
}

export function todaySummary(store: WorklogStore): DailySummary | undefined {
  return store.dailySummary(1).find(s => s.date === localDateString());
}
