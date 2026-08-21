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
  const parsed = typeof days === 'string' ? Number(days) : Number(days);
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
    if (typeof parsed.title !== 'string' || parsed.title.trim().length === 0) {
      throw new Error('worklog.editEntry "title" must be a non-empty string');
    }
    editArgs.title = parsed.title.trim();
  }
  if (parsed.summary !== undefined) {
    if (typeof parsed.summary !== 'string') {
      throw new Error('worklog.editEntry "summary" must be a string');
    }
    editArgs.summary = parsed.summary.trim();
  }
  if (parsed.timeMinutes !== undefined) {
    if (!Number.isInteger(parsed.timeMinutes) || parsed.timeMinutes < 0) {
      throw new Error('worklog.editEntry "timeMinutes" must be a non-negative integer');
    }
    editArgs.timeMinutes = parsed.timeMinutes;
  }
  if (parsed.tags !== undefined) {
    if (typeof parsed.tags !== 'string') {
      throw new Error('worklog.editEntry "tags" must be a string');
    }
    editArgs.tags = parsed.tags.trim();
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
  if (typeof parsed.title !== 'string' || parsed.title.trim().length === 0) {
    throw new Error('worklog.addEntry requires a non-empty string "title"');
  }
  if (parsed.summary !== undefined && typeof parsed.summary !== 'string') {
    throw new Error('worklog.addEntry "summary" must be a string');
  }
  if (parsed.timeMinutes !== undefined && (!Number.isInteger(parsed.timeMinutes) || parsed.timeMinutes < 0)) {
    throw new Error('worklog.addEntry "timeMinutes" must be a non-negative integer');
  }
  if (parsed.tags !== undefined && typeof parsed.tags !== 'string') {
    throw new Error('worklog.addEntry "tags" must be a string');
  }
  return parsed;
}

interface TaskFields {
  title: string;
  summary: string;
  timeMinutes: number;
  tags: string;
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

interface TreeTaskItem extends vscode.TreeItem {
  task?: Task;
}
