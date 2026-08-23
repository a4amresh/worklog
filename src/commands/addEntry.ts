import * as vscode from 'vscode';
import { log } from '../logger';
import type { WorklogStoreHandle } from '../storeHandle';
import type { Task } from '../types';
import { hasTitle, parseAddEntryArgs } from './argParsers';
import { promptTaskFields } from './commandUtils';

export function registerAddEntryCommand(storeReady: Promise<WorklogStoreHandle>): vscode.Disposable {
  return vscode.commands.registerCommand('worklog.addEntry', async (args?: unknown) => {
    const handle = await storeReady;
    if (hasTitle(args)) {
      return addEntryFromArgs(handle, parseAddEntryArgs(args));
    }
    const fields = await promptTaskFields();
    if (!fields) {
      return;
    }
    return addEntryFromArgs(handle, fields);
  });
}

function addEntryFromArgs(handle: WorklogStoreHandle, args: { title: string; summary?: string; actualMinutes?: number; estimatedMinutes?: number; tags?: string }): Task {
  log(`worklog.addEntry invoked: ${JSON.stringify(args)}`);
  const task = handle.store.addTask(
    args.title,
    args.summary ?? '',
    args.actualMinutes ?? 0,
    args.estimatedMinutes ?? 0,
    args.tags ?? ''
  );
  handle.treeProvider.refresh();
  return task;
}
