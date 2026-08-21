import type { Task, DailySummary } from './types';

export interface ExportOptions {
  format: 'json' | 'csv';
}

export function exportEntries(entries: Task[], options: ExportOptions): string {
  switch (options.format) {
    case 'csv':
      return exportEntriesToCsv(entries);
    case 'json':
    default:
      return exportEntriesToJson(entries);
  }
}

export function exportSummary(summary: DailySummary[], options: ExportOptions): string {
  switch (options.format) {
    case 'csv':
      return exportSummaryToCsv(summary);
    case 'json':
    default:
      return exportSummaryToJson(summary);
  }
}

function exportEntriesToJson(entries: Task[]): string {
  return JSON.stringify(entries, null, 2);
}

function exportEntriesToCsv(entries: Task[]): string {
  const headers = ['id', 'title', 'summary', 'timeMinutes', 'tags', 'createdAt', 'updatedAt'];
  const rows = entries.map(t => [
    t.id,
    escapeCsv(t.title),
    escapeCsv(t.summary),
    t.timeMinutes,
    escapeCsv(t.tags),
    escapeCsv(t.createdAt),
    escapeCsv(t.updatedAt),
  ]);
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function exportSummaryToJson(summary: DailySummary[]): string {
  return JSON.stringify(summary, null, 2);
}

function exportSummaryToCsv(summary: DailySummary[]): string {
  const headers = ['date', 'totalMinutes', 'entryCount'];
  const rows = summary.map(s => [s.date, s.totalMinutes, s.entryCount]);
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function escapeCsv(value: string): string {
  if (!value) {
    return '';
  }
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
