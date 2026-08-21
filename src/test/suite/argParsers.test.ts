import * as assert from 'assert';
import {
  hasTitle,
  parseAddEntryArgs,
  parseDays,
  parseDeleteArgs,
  parseEditEntryArgs,
  parseJsonArg,
} from '../../commands/argParsers';

suite('Argument Parser Test Suite', () => {
  suite('parseJsonArg', () => {
    test('returns the same object when given an object', () => {
      const input = { title: 'Test' };
      const result = parseJsonArg<Record<string, unknown>>(input);
      assert.strictEqual(result, input);
    });

    test('parses a JSON string into an object', () => {
      const result = parseJsonArg<{ title: string }>('{"title":"Test"}');
      assert.strictEqual(result.title, 'Test');
    });

    test('throws when given undefined', () => {
      assert.throws(() => parseJsonArg<unknown>(undefined), /Expected an arguments object, primitive value, or JSON string/);
    });

    test('throws when given invalid JSON string', () => {
      assert.throws(() => parseJsonArg<unknown>('{invalid'), /Argument is a string but not valid JSON/);
    });
  });

  suite('hasTitle', () => {
    test('returns true for object with non-empty title', () => {
      assert.strictEqual(hasTitle({ title: 'Test' }), true);
    });

    test('returns true for JSON string with non-empty title', () => {
      assert.strictEqual(hasTitle('{"title":"Test"}'), true);
    });

    test('returns false for missing title', () => {
      assert.strictEqual(hasTitle({ summary: 'Test' }), false);
    });

    test('returns false for empty title', () => {
      assert.strictEqual(hasTitle({ title: '   ' }), false);
    });

    test('returns false for undefined', () => {
      assert.strictEqual(hasTitle(undefined), false);
    });

    test('returns false for invalid JSON string', () => {
      assert.strictEqual(hasTitle('{invalid'), false);
    });
  });

  suite('parseAddEntryArgs', () => {
    test('parses valid add entry args', () => {
      const result = parseAddEntryArgs({ title: 'Test', timeMinutes: 30 });
      assert.strictEqual(result.title, 'Test');
      assert.strictEqual(result.timeMinutes, 30);
    });

    test('throws when title is missing', () => {
      assert.throws(() => parseAddEntryArgs({ summary: 'Test' }), /requires a non-empty string "title"/);
    });

    test('throws when timeMinutes is negative', () => {
      assert.throws(() => parseAddEntryArgs({ title: 'Test', timeMinutes: -1 }), /"timeMinutes" must be a non-negative integer/);
    });

    test('throws when tags is not a string', () => {
      assert.throws(() => parseAddEntryArgs({ title: 'Test', tags: 123 }), /"tags" must be a string/);
    });
  });

  suite('parseEditEntryArgs', () => {
    test('returns undefined for undefined args', () => {
      assert.strictEqual(parseEditEntryArgs(undefined), undefined);
    });

    test('returns undefined when id is missing', () => {
      assert.strictEqual(parseEditEntryArgs({ title: 'Test' }), undefined);
    });

    test('parses valid edit args', () => {
      const result = parseEditEntryArgs({ id: 1, title: 'Updated' });
      assert.ok(result);
      assert.strictEqual(result!.id, 1);
      assert.strictEqual(result!.title, 'Updated');
    });

    test('trims title', () => {
      const result = parseEditEntryArgs({ id: 1, title: '  Updated  ' });
      assert.strictEqual(result!.title, 'Updated');
    });

    test('throws when title is empty string', () => {
      assert.throws(() => parseEditEntryArgs({ id: 1, title: '' }), /"title" must be a non-empty string/);
    });

    test('throws when timeMinutes is negative', () => {
      assert.throws(() => parseEditEntryArgs({ id: 1, timeMinutes: -5 }), /"timeMinutes" must be a non-negative integer/);
    });
  });

  suite('parseDeleteArgs', () => {
    test('returns undefined for undefined args', () => {
      assert.strictEqual(parseDeleteArgs(undefined), undefined);
    });

    test('parses numeric id', () => {
      assert.strictEqual(parseDeleteArgs(1), 1);
    });

    test('parses id from object', () => {
      assert.strictEqual(parseDeleteArgs({ id: 2 }), 2);
    });

    test('parses id from JSON string', () => {
      assert.strictEqual(parseDeleteArgs('{"id":3}'), 3);
    });

    test('returns undefined for invalid id', () => {
      assert.strictEqual(parseDeleteArgs({ id: 0 }), undefined);
    });
  });

  suite('parseDays', () => {
    test('defaults to 7 when undefined', () => {
      assert.strictEqual(parseDays(undefined), 7);
    });

    test('returns number when valid', () => {
      assert.strictEqual(parseDays(14), 14);
    });

    test('parses numeric string', () => {
      assert.strictEqual(parseDays('30'), 30);
    });

    test('falls back to 7 for invalid string', () => {
      assert.strictEqual(parseDays('abc'), 7);
    });

    test('falls back to 7 for non-positive number', () => {
      assert.strictEqual(parseDays(0), 7);
    });
  });
});
