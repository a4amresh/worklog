export interface AddEntryArgs {
  title: string;
  summary?: string;
  actualMinutes?: number;
  estimatedMinutes?: number;
  tags?: string;
}

export interface EditEntryArgs {
  id: number;
  title?: string;
  summary?: string;
  actualMinutes?: number;
  estimatedMinutes?: number;
  tags?: string;
}

export interface TaskFields {
  title: string;
  summary: string;
  actualMinutes: number;
  estimatedMinutes: number;
  tags: string;
}

export function parseDays(days: unknown): number {
  if (days === undefined) {
    return 7;
  }
  const parsed = Number(days);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 7;
}

export function parseJsonArg<T>(args: unknown): T {
  if (args === undefined || args === null) {
    throw new Error('Expected an arguments object, primitive value, or JSON string');
  }
  if (typeof args === 'object') {
    return args as T;
  }
  if (typeof args === 'string') {
    try {
      return JSON.parse(args) as T;
    } catch {
      throw new Error('Argument is a string but not valid JSON');
    }
  }
  return args as T;
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
  if (parsed.actualMinutes !== undefined) {
    editArgs.actualMinutes = validateTimeMinutes(parsed.actualMinutes, 'worklog.editEntry', 'actualMinutes');
  }
  if (parsed.estimatedMinutes !== undefined) {
    editArgs.estimatedMinutes = validateTimeMinutes(parsed.estimatedMinutes, 'worklog.editEntry', 'estimatedMinutes');
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
  if (args.actualMinutes !== undefined && (!Number.isInteger(args.actualMinutes) || args.actualMinutes < 0)) {
    throw new Error(`${command} "actualMinutes" must be a non-negative integer`);
  }
  if (args.estimatedMinutes !== undefined && (!Number.isInteger(args.estimatedMinutes) || args.estimatedMinutes < 0)) {
    throw new Error(`${command} "estimatedMinutes" must be a non-negative integer`);
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

export function validateTimeMinutes(value: unknown, command: string, field = 'actualMinutes'): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`${command} "${field}" must be a non-negative integer`);
  }
  return value as number;
}
