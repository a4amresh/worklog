import * as vscode from 'vscode';
import { WorklogStore } from '../store';
import { WorklogTreeProvider } from '../treeProvider';
import { localDateString } from '../dateUtil';
import type { Task, DailySummary } from '../types';
import type { WorklogStoreHandle } from '../storeHandle';

export interface AddEntryArgs {
  title: string;
  summary?: string;
  timeMinutes?: number;
  tags?: string;
}

export interface EditEntryArgs {
  id: number;
  title?: string;
  summary?: string;
  timeMinutes?: number;
  tags?: string;
}

export interface TaskFields {
  title: string;
  summary: string;
  timeMinutes: number;
  tags: string;
}

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
    tasks.map(t => ({ label: t.title, description: `${t.timeMinutes} min`, task: t })),
    { placeHolder: 'Select a worklog entry' }
  );
  return pick?.task;
}

export async function promptTaskFields(defaults?: Partial<TaskFields>): Promise<TaskFields | undefined> {
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
    value: defaults?.timeMinutes?.toString() ?? '',
    validateInput: (value) => {
      const n = Number(value);
      return Number.isInteger(n) && n >= 0 ? undefined : 'Enter a positive whole number';
    },
  });
  if (timeInput === undefined || timeInput.trim().length === 0) {
    return undefined;
  }
  const timeMinutes = Number(timeInput);

  const tags = await vscode.window.showInputBox({
    prompt: 'Tags (optional, comma-separated)',
    value: defaults?.tags,
  }) ?? '';

  return { title: title.trim(), summary: summary.trim(), timeMinutes, tags: tags.trim() };
}

export function todaySummary(store: WorklogStore): DailySummary | undefined {
  return store.dailySummary(1).find(s => s.date === localDateString());
}

export function parseDays(days: unknown): number {
  if (days === undefined) {
    return 7;
  }
  const parsed = Number(days);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 7;
}

export function parseJsonArg<T>(args: unknown): T {
  if (args && typeof args === 'object') {
    return args as T;
  }
  if (typeof args === 'string') {
    try {
      const parsed = JSON.parse(args);
      if (parsed && typeof parsed === 'object') {
        return parsed as T;
      }
    } catch {
      throw new Error('Argument is a string but not valid JSON');
    }
  }
  throw new Error(`Expected an arguments object or JSON string, got ${typeof args}`);
}

export function hasTitle(args: unknown): boolean {
  let value = args;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return false;
    }
  }
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.title === 'string' && record.title.trim().length > 0;
}

export function parseAddEntryArgs(args: unknown): AddEntryArgs {
  const parsed = parseJsonArg<AddEntryArgs>(args);
  validateTaskFields(parsed, 'worklog.addEntry');
  return parsed;
}

export function parseEditEntryArgs(args: unknown): EditEntryArgs | undefined {
  if (args === undefined || args === null) {
    return undefined;
  }
  const parsed = parseJsonArg<Partial<EditEntryArgs>>(args);
  if (typeof parsed.id !== 'number' || !Number.isInteger(parsed.id) || parsed.id <= 0) {
    return undefined;
  }
  const editArgs: EditEntryArgs = { id: parsed.id };
  if (parsed.title !== undefined) {
    editArgs.title = validateTitle(parsed.title, 'worklog.editEntry');
  }
  if (parsed.summary !== undefined) {
    editArgs.summary = validateString(parsed.summary, 'worklog.editEntry', 'summary');
  }
  if (parsed.timeMinutes !== undefined) {
    editArgs.timeMinutes = validateTimeMinutes(parsed.timeMinutes, 'worklog.editEntry');
  }
  if (parsed.tags !== undefined) {
    editArgs.tags = validateString(parsed.tags, 'worklog.editEntry', 'tags');
  }
  return editArgs;
}

export function parseDeleteArgs(args: unknown): number | undefined {
  if (args === undefined || args === null) {
    return undefined;
  }
  const parsed = parseJsonArg<{ id?: number } | number>(args);
  if (typeof parsed === 'number') {
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }
  if (typeof parsed === 'object' && typeof parsed.id === 'number') {
    return Number.isInteger(parsed.id) && parsed.id > 0 ? parsed.id : undefined;
  }
  return undefined;
}

export function validateTaskFields(args: Partial<TaskFields>, command: string): void {
  if (typeof args.title !== 'string' || args.title.trim().length === 0) {
    throw new Error(`${command} requires a non-empty string "title"`);
  }
  if (args.summary !== undefined && typeof args.summary !== 'string') {
    throw new Error(`${command} "summary" must be a string`);
  }
  if (args.timeMinutes !== undefined && (!Number.isInteger(args.timeMinutes) || args.timeMinutes < 0)) {
    throw new Error(`${command} "timeMinutes" must be a non-negative integer`);
  }
  if (args.tags !== undefined && typeof args.tags !== 'string') {
    throw new Error(`${command} "tags" must be a string`);
  }
}

export function validateTitle(value: unknown, command: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${command} "title" must be a non-empty string`);
  }
  return value.trim();
}

export function validateString(value: unknown, command: string, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${command} "${field}" must be a string`);
  }
  return value.trim();
}

export function validateTimeMinutes(value: unknown, command: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`${command} "timeMinutes" must be a non-negative integer`);
  }
  return value as number;
}
