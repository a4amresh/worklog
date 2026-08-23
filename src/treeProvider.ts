import * as vscode from 'vscode';
import { WorklogStore } from './store';
import { localDateString, localYesterdayString } from './dateUtil';
import { Task, DailySummary } from './types';

export class WorklogTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private store?: WorklogStore;

  setStore(store: WorklogStore): void {
    this.store = store;
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (!this.store) {
      return Promise.resolve([
        new vscode.TreeItem('Worklog is initializing...', vscode.TreeItemCollapsibleState.None),
      ]);
    }

    if (element instanceof DayGroupItem) {
      const tasks = this.store.listTasks({ date: element.date });
      return Promise.resolve(tasks.map(t => new TaskTreeItem(t)));
    }

    const tasks = this.store.listTasks();
    const groups = groupTasksByDate(tasks);
    return Promise.resolve(
      Object.entries(groups).map(([date, dayTasks]) => new DayGroupItem(date, dayTasks))
    );
  }
}

class DayGroupItem extends vscode.TreeItem {
  constructor(
    public readonly date: string,
    private tasks: Task[]
  ) {
    super(formatDateLabel(date), vscode.TreeItemCollapsibleState.Collapsed);
    this.tooltip = `${tasks.length} entries · ${tasks.reduce((sum, t) => sum + t.actualMinutes, 0)} min`;
    this.iconPath = new vscode.ThemeIcon('calendar');
  }
}

class TaskTreeItem extends vscode.TreeItem {
  constructor(public readonly task: Task) {
    super(task.title, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'task';
    const tagPart = task.tags ? ` [${task.tags}]` : '';
    const estimatePart = task.estimatedMinutes > 0 ? ` / est ${task.estimatedMinutes} min` : '';
    this.description = `${task.actualMinutes} min${estimatePart}${tagPart}`;
    this.tooltip = `${task.title}\n${task.summary || ''}\nTime: ${task.actualMinutes} min\nEstimated: ${task.estimatedMinutes} min\nCreated: ${task.createdAt}`;
    this.iconPath = new vscode.ThemeIcon('note');
  }
}

function groupTasksByDate(tasks: Task[]): Record<string, Task[]> {
  return tasks.reduce((groups, task) => {
    const date = task.createdAt.split('T')[0].split(' ')[0];
    groups[date] = groups[date] || [];
    groups[date].push(task);
    return groups;
  }, {} as Record<string, Task[]>);
}

function formatDateLabel(date: string): string {
  const today = localDateString();
  const yesterday = localYesterdayString();
  if (date === today) {
    return 'Today';
  }
  if (date === yesterday) {
    return 'Yesterday';
  }
  return date;
}
