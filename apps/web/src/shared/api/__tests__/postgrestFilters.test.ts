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

  // Non-ASCII whitespace matched by \s must be UTF-8 percent-encoded, not byte-encoded.
  // NBSP U+00A0 → UTF-8 0xC2 0xA0. Previous implementation emitted invalid `%A0`.
  // U+2028 LINE SEPARATOR → UTF-8 0xE2 0x80 0xA8. Previous implementation emitted invalid `%2028`.
  it.each([
    ['\u00A0', '%C2%A0'],
    ['\u2028', '%E2%80%A8'],
    ['\u3000', '%E3%80%80'],
  ])('UTF-8 percent-encodes non-ASCII whitespace %j as %j', (input, expected) => {
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
