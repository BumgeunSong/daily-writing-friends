import { describe, it, expect } from 'vitest';
import { mapRowToReview, mapReviewToSupabaseRow, SupabaseReviewRow } from './reviewUtils';
import { Review } from '@/login/model/Review';

describe('mapRowToReview', () => {
  it('maps all fields from Supabase row to Review', () => {
    const row: SupabaseReviewRow = {
      reviewer_id: 'user-1',
      reviewer_nickname: 'nick',
      keep_text: 'keep doing this',
      problem_text: 'stop doing that',
      try_text: 'try this next',
      nps: 9,
      will_continue: 'yes',
    };

    expect(mapRowToReview(row)).toEqual({
      reviewer: { uid: 'user-1', nickname: 'nick' },
      keep: 'keep doing this',
      problem: 'stop doing that',
      try: 'try this next',
      nps: 9,
      willContinue: 'yes',
    });
  });

  it('handles null optional fields', () => {
    const row: SupabaseReviewRow = {
      reviewer_id: 'user-2',
      reviewer_nickname: null,
      keep_text: null,
      problem_text: null,
      try_text: null,
      nps: null,
      will_continue: null,
    };

    const result = mapRowToReview(row);

    expect(result.reviewer.nickname).toBeUndefined();
    expect(result.keep).toBeUndefined();
    expect(result.problem).toBeUndefined();
    expect(result.try).toBeUndefined();
    expect(result.nps).toBe(0);
    expect(result.willContinue).toBe('no');
  });

  it('preserves "no" willContinue value', () => {
    const row: SupabaseReviewRow = {
      reviewer_id: 'user-3',
      reviewer_nickname: 'test',
      keep_text: null,
      problem_text: null,
      try_text: null,
      nps: 5,
      will_continue: 'no',
    };

    expect(mapRowToReview(row).willContinue).toBe('no');
  });
});

describe('mapReviewToSupabaseRow', () => {
  it('maps Review to Supabase row with boardId', () => {
    const review: Review = {
      reviewer: { uid: 'user-1', nickname: 'nick' },
      keep: 'keep this',
      problem: 'fix this',
      try: 'try this',
      nps: 8,
      willContinue: 'yes',
    };

    expect(mapReviewToSupabaseRow('board-1', review)).toEqual({
      id: 'user-1',
      board_id: 'board-1',
      reviewer_id: 'user-1',
      reviewer_nickname: 'nick',
      keep_text: 'keep this',
      problem_text: 'fix this',
      try_text: 'try this',
      nps: 8,
      will_continue: 'yes',
    });
  });

  it('converts undefined optional fields to null', () => {
    const review: Review = {
      reviewer: { uid: 'user-2' },
      nps: 7,
      willContinue: 'no',
    };

    const result = mapReviewToSupabaseRow('board-2', review);

    expect(result.reviewer_nickname).toBeNull();
    expect(result.keep_text).toBeNull();
    expect(result.problem_text).toBeNull();
    expect(result.try_text).toBeNull();
  });

  it('uses reviewer uid as row id', () => {
    const review: Review = {
      reviewer: { uid: 'unique-uid' },
      nps: 10,
      willContinue: 'yes',
    };

    const result = mapReviewToSupabaseRow('board-x', review);

    expect(result.id).toBe('unique-uid');
    expect(result.reviewer_id).toBe('unique-uid');
  });
});
