import * as vscode from 'vscode';
import { WorklogStore } from './store';
import { WorklogTreeProvider } from './treeProvider';
import { localDateString } from './dateUtil';
import { log, logError } from './logger';
import type { Task, DailySummary } from './types';
import type { WorklogStoreHandle } from './storeHandle';

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

interface TaskFields {
  title: string;
  summary: string;
  timeMinutes: number;
  tags: string;
}

interface TreeTaskItem extends vscode.TreeItem {
  task?: Task;
}

export function registerCommands(
  storeReady: Promise<WorklogStoreHandle>
): vscode.Disposable[] {
  log('Worklog commands registered');

  const getHandle = async (): Promise<WorklogStoreHandle> => storeReady;
  const getStore = async (): Promise<WorklogStore> => (await getHandle()).store;

  return [
    vscode.commands.registerCommand('worklog.addEntry', async (args?: unknown) => {
      const handle = await getHandle();
      if (hasTitle(args)) {
        return addEntryFromArgs(handle, parseAddEntryArgs(args));
      }
      const fields = await promptTaskFields();
      if (!fields) {
        return;
      }
      return addEntryFromArgs(handle, fields);
    }),

    vscode.commands.registerCommand('worklog.editEntry', async (args?: unknown) => {
      try {
        const handle = await getHandle();
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
    }),

    vscode.commands.registerCommand('worklog.deleteEntry', async (args?: unknown) => {
      try {
        const handle = await getHandle();
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
    }),

    vscode.commands.registerCommand('worklog.getEntries', async (filter?: unknown) => {
      const store = await getStore();
      if (!filter) {
        return store.listTasks();
      }
      return store.listTasks(parseJsonArg<{ tag?: string; date?: string }>(filter));
    }),

    vscode.commands.registerCommand('worklog.getTodaySummary', async () => {
      const store = await getStore();
      return todaySummary(store);
    }),

    vscode.commands.registerCommand('worklog.getSummary', async (days?: unknown) => {
      const store = await getStore();
      return store.dailySummary(parseDays(days));
    }),

    vscode.commands.registerCommand('worklog.refresh', async () => {
      (await getHandle()).treeProvider.refresh();
    }),
  ];
}

function addEntryFromArgs(handle: WorklogStoreHandle, args: AddEntryArgs): Task {
  const task = handle.store.addTask(
    args.title,
    args.summary ?? '',
    args.timeMinutes ?? 0,
    args.tags ?? ''
  );
  handle.treeProvider.refresh();
  return task;
}

function todaySummary(store: WorklogStore): DailySummary | undefined {
  return store.dailySummary(1).find(s => s.date === localDateString());
}

function parseDays(days: unknown): number {
  if (days === undefined) {
    return 7;
  }
  const parsed = Number(days);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 7;
}

function parseJsonArg<T>(args: unknown): T {
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

function hasTitle(args: unknown): boolean {
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

function parseAddEntryArgs(args: unknown): AddEntryArgs {
  const parsed = parseJsonArg<AddEntryArgs>(args);
  validateTaskFields(parsed, 'worklog.addEntry');
  return parsed;
}

function parseEditEntryArgs(args: unknown): EditEntryArgs | undefined {
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

function parseDeleteArgs(args: unknown): number | undefined {
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

function validateTaskFields(args: Partial<TaskFields>, command: string): void {
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

function validateTitle(value: unknown, command: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${command} "title" must be a non-empty string`);
  }
  return value.trim();
}

function validateString(value: unknown, command: string, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${command} "${field}" must be a string`);
  }
  return value.trim();
}

function validateTimeMinutes(value: unknown, command: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`${command} "timeMinutes" must be a non-negative integer`);
  }
  return value as number;
}

async function promptTaskFields(defaults?: Partial<TaskFields>): Promise<TaskFields | undefined> {
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

interface TaskQuickPickItem extends vscode.QuickPickItem {
  task: Task;
}

async function taskFromItem(item: vscode.TreeItem | undefined, store: WorklogStore): Promise<Task | undefined> {
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
