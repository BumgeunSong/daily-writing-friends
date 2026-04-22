import { describe, it, expect } from 'vitest';
import {
  FIXTURE_ALL_FORMATS,
  FIXTURE_WITH_IMAGES,
  FIXTURE_KOREAN_MIXED,
  FIXTURE_EMPTY,
  FIXTURE_REAL_POST,
  FIXTURES,
} from './editor-html-fixtures';

describe('Editor HTML Fixtures', () => {
  const namedFixtures = [
    ['FIXTURE_ALL_FORMATS', FIXTURE_ALL_FORMATS],
    ['FIXTURE_WITH_IMAGES', FIXTURE_WITH_IMAGES],
    ['FIXTURE_KOREAN_MIXED', FIXTURE_KOREAN_MIXED],
    ['FIXTURE_REAL_POST', FIXTURE_REAL_POST],
  ] as const;

  it.each(namedFixtures)('%s parses without DOMParser errors', (name, html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const parseError = doc.querySelector('parsererror');
    expect(parseError).toBeNull();
  });

  it('FIXTURE_EMPTY is an empty string', () => {
    expect(FIXTURE_EMPTY).toBe('');
  });

  it('FIXTURES map contains all 5 entries', () => {
    expect(Object.keys(FIXTURES)).toHaveLength(5);
    expect(FIXTURES).toHaveProperty('all-formats');
    expect(FIXTURES).toHaveProperty('with-images');
    expect(FIXTURES).toHaveProperty('korean-mixed');
    expect(FIXTURES).toHaveProperty('empty');
    expect(FIXTURES).toHaveProperty('real-post');
  });

  it.each(namedFixtures)('%s contains expected HTML elements', (name, html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    // Each non-empty fixture should have at least one HTML element
    expect(doc.body.children.length).toBeGreaterThan(0);
  });
});
