import * as assert from 'assert';
import { exportEntries, exportSummary } from '../../export';
import type { Task, DailySummary } from '../../types';

suite('Export Test Suite', () => {
  const entries: Task[] = [
    {
      id: 1,
      title: 'Design schema',
      summary: 'Plan DB tables',
      actualMinutes: 60,
      estimatedMinutes: 30,
      tags: 'planning',
      createdAt: '2026-08-21 09:00:00',
      updatedAt: '2026-08-21 09:00:00',
    },
    {
      id: 2,
      title: 'Refactor "auth" middleware',
      summary: 'Extracted JWT\nvalidation',
      actualMinutes: 45,
      estimatedMinutes: 40,
      tags: 'refactor,auth',
      createdAt: '2026-08-21 10:00:00',
      updatedAt: '2026-08-21 10:00:00',
    },
  ];

  test('exports entries to JSON', () => {
    const result = exportEntries(entries, { format: 'json' });
    const parsed = JSON.parse(result);
    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].title, 'Design schema');
    assert.strictEqual(parsed[1].actualMinutes, 45);
  });

  test('exports entries to CSV', () => {
    const result = exportEntries(entries, { format: 'csv' });
    const lines = result.split('\n');
    assert.strictEqual(lines[0], 'id,title,summary,actualMinutes,estimatedMinutes,tags,createdAt,updatedAt');
    assert.ok(result.includes('Design schema'));
    assert.ok(result.includes('"Refactor ""auth"" middleware"'));
    assert.ok(result.includes('"Extracted JWT'));
  });

  test('exports summary to JSON', () => {
    const summary: DailySummary[] = [
      { date: '2026-08-21', totalMinutes: 105, entryCount: 2 },
    ];
    const result = exportSummary(summary, { format: 'json' });
    const parsed = JSON.parse(result);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].totalMinutes, 105);
  });

  test('exports summary to CSV', () => {
    const summary: DailySummary[] = [
      { date: '2026-08-21', totalMinutes: 105, entryCount: 2 },
    ];
    const result = exportSummary(summary, { format: 'csv' });
    const lines = result.split('\n');
    assert.strictEqual(lines[0], 'date,totalMinutes,entryCount');
    assert.strictEqual(lines[1], '2026-08-21,105,2');
  });

  test('defaults to JSON when format is unknown', () => {
    const result = exportEntries(entries, { format: 'unknown' as 'json' });
    assert.doesNotThrow(() => JSON.parse(result));
  });
});
