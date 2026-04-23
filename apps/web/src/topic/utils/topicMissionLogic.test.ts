import { describe, it, expect } from 'vitest';
import { computeNextAssignment, isValidStatusTransition } from './topicMissionLogic';

// T.3: computeNextAssignment with one assigned + multiple pending
describe('computeNextAssignment', () => {
  describe('when one assigned and multiple pending entries exist', () => {
    it('returns correct completeId, assignId (first pending by order_index), and wrapped: false', () => {
      const entries = [
        { id: 'a', status: 'assigned' as const, order_index: 1 },
        { id: 'b', status: 'pending' as const, order_index: 2 },
        { id: 'c', status: 'pending' as const, order_index: 3 },
      ];
      const result = computeNextAssignment(entries);
      expect(result.completeId).toBe('a');
      expect(result.assignId).toBe('b');
      expect(result.wrapped).toBe(false);
    });
  });

  // T.4: computeNextAssignment with one assigned + no pending → wrapped: true
  describe('when one assigned and no pending entries remain', () => {
    it('returns wrapped: true and assigns same entry after wrap-around reset', () => {
      const entries = [{ id: 'a', status: 'assigned' as const, order_index: 1 }];
      const result = computeNextAssignment(entries);
      expect(result.completeId).toBe('a');
      expect(result.assignId).toBe('a');
      expect(result.wrapped).toBe(true);
    });

    it('assigns first entry by order_index when multiple completed entries exist', () => {
      const entries = [
        { id: 'a', status: 'assigned' as const, order_index: 1 },
        { id: 'b', status: 'completed' as const, order_index: 2 },
        { id: 'c', status: 'completed' as const, order_index: 3 },
      ];
      const result = computeNextAssignment(entries);
      expect(result.completeId).toBe('a');
      expect(result.assignId).toBe('a');
      expect(result.wrapped).toBe(true);
    });
  });

  // T.5: computeNextAssignment with only skipped entries → wrapped: true
  describe('when only skipped entries exist', () => {
    it('returns completeId null, assigns first by order_index, wrapped: true', () => {
      const entries = [
        { id: 'b', status: 'skipped' as const, order_index: 2 },
        { id: 'a', status: 'skipped' as const, order_index: 1 },
      ];
      const result = computeNextAssignment(entries);
      expect(result.completeId).toBeNull();
      expect(result.assignId).toBe('a');
      expect(result.wrapped).toBe(true);
    });
  });
});

// T.6: status transition validator
describe('isValidStatusTransition', () => {
  it('pending → assigned is valid', () => {
    expect(isValidStatusTransition('pending', 'assigned')).toBe(true);
  });

  it('pending → completed is invalid', () => {
    expect(isValidStatusTransition('pending', 'completed')).toBe(false);
  });

  it('pending → skipped is valid', () => {
    expect(isValidStatusTransition('pending', 'skipped')).toBe(true);
  });

  it('assigned → completed is valid', () => {
    expect(isValidStatusTransition('assigned', 'completed')).toBe(true);
  });

  it('assigned → skipped is valid', () => {
    expect(isValidStatusTransition('assigned', 'skipped')).toBe(true);
  });

  it('assigned → pending is valid', () => {
    expect(isValidStatusTransition('assigned', 'pending')).toBe(true);
  });

  it('completed → pending is valid', () => {
    expect(isValidStatusTransition('completed', 'pending')).toBe(true);
  });

  it('skipped → pending is valid', () => {
    expect(isValidStatusTransition('skipped', 'pending')).toBe(true);
  });
});
