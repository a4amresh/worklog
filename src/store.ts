import * as fs from 'fs';
import * as path from 'path';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type { Task, DailySummary } from './types';

export interface WorklogStoreOptions {
  dbPath: string;
}

const SCHEMA_VERSION = 2;

export class WorklogStore {
  private SQL!: SqlJsStatic;
  private db!: Database;
  private dbPath: string;

  constructor(options: WorklogStoreOptions) {
    this.dbPath = options.dbPath;
  }

  async init(): Promise<void> {
    this.SQL = await initSqlJs();
    const data = this.readExistingData();
    this.db = new this.SQL.Database(data);
    this.migrate();
    this.persist();
  }

  addTask(title: string, summary: string, timeMinutes: number, tags: string): Task {
    this.db.run(`
      INSERT INTO tasks (title, summary, time_minutes, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
    `, [title.trim(), summary.trim(), timeMinutes, tags.trim()]);
    const row = this.db.exec('SELECT * FROM tasks WHERE id = last_insert_rowid()')[0];
    const task = this.mapRow(row.columns, row.values[0]);
    this.persist();
    return task;
  }

  updateTask(id: number, updates: Partial<Pick<Task, 'title' | 'summary' | 'timeMinutes' | 'tags'>>): Task | undefined {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title.trim());
    }
    if (updates.summary !== undefined) {
      fields.push('summary = ?');
      values.push(updates.summary.trim());
    }
    if (updates.timeMinutes !== undefined) {
      fields.push('time_minutes = ?');
      values.push(updates.timeMinutes);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(updates.tags.trim());
    }
    if (fields.length === 0) {
      return this.getTask(id);
    }

    fields.push('updated_at = datetime("now", "localtime")');
    values.push(id);

    this.db.run(`
      UPDATE tasks
      SET ${fields.join(', ')}
      WHERE id = ?
    `, values);
    this.persist();
    return this.getTask(id);
  }

  getTask(id: number): Task | undefined {
    const result = this.db.exec('SELECT * FROM tasks WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) {
      return undefined;
    }
    return this.mapRow(result[0].columns, result[0].values[0]);
  }

  listTasks(filter?: { tag?: string; date?: string }): Task[] {
    let sql = 'SELECT * FROM tasks';
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter?.date) {
      conditions.push('date(created_at) = ?');
      params.push(filter.date);
    }
    if (filter?.tag) {
      conditions.push('tags LIKE ?');
      params.push(`%${filter.tag.trim()}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY created_at DESC';

    const result = params.length > 0
      ? this.db.exec(sql, params)
      : this.db.exec(sql);

    if (result.length === 0) {
      return [];
    }
    const { columns, values } = result[0];
    return values.map(row => this.mapRow(columns, row));
  }

  deleteTask(id: number): void {
    this.db.run('DELETE FROM tasks WHERE id = ?', [id]);
    this.persist();
  }

  dailySummary(limit = 30): DailySummary[] {
    const result = this.db.exec(`
      SELECT
        date(created_at) AS date,
        SUM(time_minutes) AS total_minutes,
        COUNT(*) AS entry_count
      FROM tasks
      GROUP BY date(created_at)
      ORDER BY date DESC
      LIMIT ?
    `, [limit]);
    if (result.length === 0) {
      return [];
    }
    const { columns, values } = result[0];
    return values.map(row => {
      const record: Record<string, unknown> = {};
      columns.forEach((col, i) => { record[col] = row[i]; });
      return {
        date: record.date as string,
        totalMinutes: record.total_minutes as number,
        entryCount: record.entry_count as number,
      };
    });
  }

  close(): void {
    this.persist();
    this.db?.close();
  }

  private readExistingData(): Uint8Array | undefined {
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      return new Uint8Array(buffer);
    }
    return undefined;
  }

  private persist(): void {
    const data = this.db.export();
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  private migrate(): void {
    this.ensureSchemaVersionTable();

    const versionResult = this.db.exec('SELECT version FROM schema_version WHERE id = 1');
    const currentVersion = versionResult.length > 0 && versionResult[0].values.length > 0
      ? (versionResult[0].values[0][0] as number)
      : 0;

    if (currentVersion < SCHEMA_VERSION) {
      this.recreateTasksTableIfNeeded();

      this.db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          summary TEXT,
          time_minutes INTEGER NOT NULL CHECK(time_minutes >= 0),
          tags TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks(tags);
      `);

      this.db.run('UPDATE schema_version SET version = ? WHERE id = 1', [SCHEMA_VERSION]);
    }
  }

  private ensureSchemaVersionTable(): void {
    const tableInfo = this.db.exec("PRAGMA table_info(schema_version)");
    if (tableInfo.length > 0) {
      const columns = tableInfo[0].columns;
      const nameIndex = columns.indexOf('name');
      const hasIdColumn = tableInfo[0].values.some(row => row[nameIndex] === 'id');
      if (!hasIdColumn) {
        this.db.run('DROP TABLE schema_version');
      }
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_version (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER NOT NULL DEFAULT 0
      );
      INSERT OR IGNORE INTO schema_version (id, version) VALUES (1, 0);
    `);
  }

  private recreateTasksTableIfNeeded(): void {
    const tableInfo = this.db.exec("PRAGMA table_info(tasks)");
    if (tableInfo.length === 0) {
      return;
    }
    const columns = tableInfo[0].columns;
    const nameIndex = columns.indexOf('name');
    const hasTimeMinutes = tableInfo[0].values.some(row => row[nameIndex] === 'time_minutes');
    if (!hasTimeMinutes) {
      this.db.run('DROP TABLE tasks');
    }
  }

  private mapRow(columns: string[], row: (number | string | Uint8Array | null)[]): Task {
    const record: Record<string, unknown> = {};
    columns.forEach((col, i) => { record[col] = row[i]; });
    return {
      id: record.id as number,
      title: record.title as string,
      summary: record.summary as string,
      timeMinutes: record.time_minutes as number,
      tags: record.tags as string,
      createdAt: record.created_at as string,
      updatedAt: record.updated_at as string,
    };
  }
}
