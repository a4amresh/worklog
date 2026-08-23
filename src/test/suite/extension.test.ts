import * as assert from 'assert';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { WorklogStore } from '../../store';

suite('Worklog Store Test Suite', () => {
  let store: WorklogStore;
  let dbPath: string;

  setup(async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worklog-test-'));
    dbPath = path.join(tmpDir, 'worklog.db');
    store = new WorklogStore({ dbPath });
    await store.init();
  });

  teardown(async () => {
    store.close();
    if (dbPath) {
      fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
    }
  });

  test('adds and retrieves a worklog entry', () => {
    const task = store.addTask('Design schema', 'Plan DB tables', 60, 30, 'planning');
    assert.strictEqual(task.title, 'Design schema');
    assert.strictEqual(task.summary, 'Plan DB tables');
    assert.strictEqual(task.actualMinutes, 60);
    assert.strictEqual(task.estimatedMinutes, 30);
    assert.strictEqual(task.tags, 'planning');

    const fetched = store.getTask(task.id);
    assert.ok(fetched);
    assert.strictEqual(fetched!.title, 'Design schema');
    assert.strictEqual(fetched!.estimatedMinutes, 30);
  });

  test('updates a worklog entry', () => {
    const task = store.addTask('Refactor', '', 30, 20, '');
    const updated = store.updateTask(task.id, { actualMinutes: 45, estimatedMinutes: 25, summary: 'Cleanup' });
    assert.ok(updated);
    assert.strictEqual(updated!.actualMinutes, 45);
    assert.strictEqual(updated!.estimatedMinutes, 25);
    assert.strictEqual(updated!.summary, 'Cleanup');
  });

  test('deletes a worklog entry', () => {
    const task = store.addTask('Remove me', '', 15, 10, '');
    store.deleteTask(task.id);
    assert.strictEqual(store.getTask(task.id), undefined);
  });

  test('groups daily summaries', () => {
    store.addTask('A', '', 30, 20, '');
    store.addTask('B', '', 45, 30, '');
    const summary = store.dailySummary();
    assert.strictEqual(summary.length, 1);
    assert.strictEqual(summary[0].totalMinutes, 75);
    assert.strictEqual(summary[0].entryCount, 2);
  });

  test('filters by tag', () => {
    store.addTask('Tagged', '', 20, 10, 'client');
    store.addTask('Untagged', '', 10, 0, '');
    const filtered = store.listTasks({ tag: 'client' });
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].title, 'Tagged');
  });
});
