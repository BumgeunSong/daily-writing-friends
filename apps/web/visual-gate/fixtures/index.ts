import { commentsLongThread } from './commentsLongThread';
import type { Fixture } from './types';

export const FIXTURES: Record<string, Fixture> = {
  [commentsLongThread.name]: commentsLongThread,
};

export function getFixture(name: string | null): Fixture | null {
  return name ? FIXTURES[name] ?? null : null;
}

export type { Fixture } from './types';
