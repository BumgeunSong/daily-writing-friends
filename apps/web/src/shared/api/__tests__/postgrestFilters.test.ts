import { describe, expect, it } from 'vitest';
import { escapeForOrFilter } from '../postgrestFilters';

describe('escapeForOrFilter', () => {
  it('returns empty for empty input', () => {
    expect(escapeForOrFilter('')).toBe('');
  });

  it('passes plain ASCII through unchanged', () => {
    expect(escapeForOrFilter('hello')).toBe('hello');
  });

  it('passes plain Korean through unchanged', () => {
    expect(escapeForOrFilter('안녕하세요')).toBe('안녕하세요');
  });

  it('escapes a single backslash to double backslash', () => {
    expect(escapeForOrFilter('\\')).toBe('\\\\');
  });

  it('escapes a single percent', () => {
    expect(escapeForOrFilter('%')).toBe('\\%');
  });

  it('escapes a single underscore', () => {
    expect(escapeForOrFilter('_')).toBe('\\_');
  });

  it.each([
    [',', '%2C'],
    ['(', '%28'],
    [')', '%29'],
    ['*', '%2A'],
    ['"', '%22'],
    [':', '%3A'],
    ['.', '%2E'],
    [' ', '%20'],
    ['\n', '%0A'],
    ['\t', '%09'],
  ])('percent-encodes %j as %j', (input, expected) => {
    expect(escapeForOrFilter(input)).toBe(expected);
  });

  it('mixes Korean and wildcards correctly', () => {
    expect(escapeForOrFilter('안녕%_하세요')).toBe('안녕\\%\\_하세요');
  });

  it('preserves leading and trailing whitespace as percent-encoded', () => {
    expect(escapeForOrFilter('  hi  ')).toBe('%20%20hi%20%20');
  });

  it('blocks PostgREST or-filter injection of a second clause', () => {
    const injection = ',author_id.eq.00000000-0000-0000-0000-000000000000';
    const escaped = escapeForOrFilter(injection);

    // Leading comma is encoded so it cannot start a new filter clause.
    expect(escaped.startsWith('%2C')).toBe(true);

    // Operator separators `.` are encoded so `eq.` cannot be parsed as an operator.
    expect(escaped).not.toContain(',');
    expect(escaped).not.toContain('.');

    // The underscore in `author_id` is ILIKE-escaped (would only match a literal `_`).
    expect(escaped).toContain('author\\_id');
  });
});
