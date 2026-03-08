import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildLogEntry } from './devLog';
import type { DevLogOptions } from './devLog';

describe('buildLogEntry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates structured entry with required fields', () => {
    const options: DevLogOptions = {
      category: 'agent',
      event: 'task_started',
    };

    const entry = buildLogEntry(options);

    expect(entry).toHaveProperty('category', 'agent');
    expect(entry).toHaveProperty('event', 'task_started');
    expect(entry).toHaveProperty('level');
    expect(entry).toHaveProperty('correlationId');
    expect(entry).toHaveProperty('timestamp', '2024-01-15T10:30:00.000Z');
  });

  it('defaults level to info', () => {
    const options: DevLogOptions = {
      category: 'agent',
      event: 'task_started',
    };

    const entry = buildLogEntry(options);

    expect(entry.level).toBe('info');
  });

  it('uses provided level when given', () => {
    const options: DevLogOptions = {
      category: 'agent',
      event: 'error_occurred',
      level: 'error',
    };

    const entry = buildLogEntry(options);

    expect(entry.level).toBe('error');
  });

  it('uses provided correlationId when given', () => {
    const options: DevLogOptions = {
      category: 'agent',
      event: 'task_started',
      correlationId: 'test-correlation-123',
    };

    const entry = buildLogEntry(options);

    expect(entry.correlationId).toBe('test-correlation-123');
  });

  it('auto-generates correlationId matching pattern', () => {
    const options: DevLogOptions = {
      category: 'agent',
      event: 'task_started',
    };

    const entry = buildLogEntry(options);

    expect(entry.correlationId).toMatch(/^[a-z0-9-]+$/);
    expect(entry.correlationId.length).toBeGreaterThan(0);
  });

  it('includes data when provided', () => {
    const testData = { taskId: '123', userId: 'user-456' };
    const options: DevLogOptions = {
      category: 'agent',
      event: 'task_started',
      data: testData,
    };

    const entry = buildLogEntry(options);

    expect(entry.data).toEqual(testData);
  });

  it('includes duration when provided', () => {
    const options: DevLogOptions = {
      category: 'agent',
      event: 'task_completed',
      duration: 1234,
    };

    const entry = buildLogEntry(options);

    expect(entry.duration).toBe(1234);
  });
});
