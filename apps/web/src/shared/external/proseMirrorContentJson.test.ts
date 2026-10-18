import { describe, expect, it } from 'vitest';

import { parseContentJson } from './proseMirrorContentJson';

describe('parseContentJson', () => {
  it('returns undefined for null', () => {
    expect(parseContentJson(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(parseContentJson(undefined)).toBeUndefined();
  });

  it('parses a minimal valid doc', () => {
    const result = parseContentJson({ type: 'doc' });
    expect(result).toEqual({ type: 'doc' });
  });

  it('parses a doc with nested nodes and marks', () => {
    const input = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'hello', marks: [{ type: 'bold' }] }],
        },
      ],
    };
    expect(parseContentJson(input)).toEqual(input);
  });

  // The schema stays permissive on node type so mention nodes (added by the
  // comment/reply editors) parse without a schema change — the reason this
  // parser is shared rather than post-specific.
  it('parses a doc containing a mention node', () => {
    const input = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'mention', attrs: { id: 'user-1', label: '단짝' } },
            { type: 'text', text: ' 안녕' },
          ],
        },
      ],
    };
    expect(parseContentJson(input)).toEqual(input);
  });

  it('rejects a text node missing its text string', () => {
    const input = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text' }] }],
    };
    expect(parseContentJson(input)).toBeUndefined();
  });

  it('rejects doc with wrong top-level type', () => {
    expect(parseContentJson({ type: 'paragraph' })).toBeUndefined();
  });

  it('rejects malformed shape (object with no type)', () => {
    expect(parseContentJson({ foo: 'bar' })).toBeUndefined();
  });

  it('rejects non-object inputs', () => {
    expect(parseContentJson('string')).toBeUndefined();
    expect(parseContentJson(42)).toBeUndefined();
    expect(parseContentJson([])).toBeUndefined();
  });
});
