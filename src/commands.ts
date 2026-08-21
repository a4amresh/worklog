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

export function registerCommands(
  storeReady: Promise<WorklogStoreHandle>
): vscode.Disposable[] {
  log('Worklog commands registered');

  const getHandle = async (): Promise<WorklogStoreHandle> => storeReady;
  const getStore = async (): Promise<WorklogStore> => (await getHandle()).store;

  return [
    vscode.commands.registerCommand('worklog.addEntry', async (args?: unknown) => {
      const handle = await getHandle();
      if (isAddEntryPayload(args)) {
        return addEntryFromArgs(handle, parseAddEntryArgs(args));
      }
      const fields = await promptTaskFields();
      if (!fields) {
        return;
      }
      return addEntryFromArgs(handle, fields);
    }),

    vscode.commands.registerCommand('worklog.editEntry', async (item: vscode.TreeItem) => {
      const handle = await getHandle();
      const task = await taskFromItem(item, handle.store);
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
      handle.store.updateTask(task.id, {
        title: fields.title,
        summary: fields.summary,
        timeMinutes: fields.timeMinutes,
        tags: fields.tags,
      });
      handle.treeProvider.refresh();
    }),

    vscode.commands.registerCommand('worklog.deleteEntry', async (item: vscode.TreeItem) => {
      const handle = await getHandle();
      const task = await taskFromItem(item, handle.store);
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
    }),

    vscode.commands.registerCommand('worklog.getEntries', async (filter?: unknown) => {
      const store = await getStore();
      if (!filter) {
        return store.listTasks();
      }
      return store.listTasks(parseAiArgs<{ tag?: string; date?: string }>(filter));
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
  const parsed = typeof days === 'string' ? Number(days) : days;
  return Number.isInteger(parsed) && (parsed as number) > 0 ? (parsed as number) : 7;
}

function parseAiArgs<T>(args: unknown): T {
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

function isAddEntryPayload(args: unknown): args is AddEntryArgs | string {
  if (typeof args === 'string') {
    try {
      const parsed = JSON.parse(args);
      return parsed && typeof parsed === 'object' && typeof parsed.title === 'string' && parsed.title.trim().length > 0;
    } catch {
      return false;
    }
  }
  if (!args || typeof args !== 'object') {
    return false;
  }
  const a = args as Record<string, unknown>;
  return typeof a.title === 'string' && a.title.trim().length > 0;
}

function parseAddEntryArgs(args: unknown): AddEntryArgs {
  const parsed = parseAiArgs<AddEntryArgs>(args);
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
  const taskItem = item as { task?: Task } | undefined;
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
