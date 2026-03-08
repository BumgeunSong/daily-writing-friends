import type { JoinFormDataForActiveUser } from "@/login/model/join";
import type { Review } from "@/login/model/Review";
import { getSupabaseClient, throwOnError } from "@/shared/api/supabaseClient";

// --- Pure mappers (testable) ---

export interface SupabaseReviewRow {
  reviewer_id: string;
  reviewer_nickname: string | null;
  keep_text: string | null;
  problem_text: string | null;
  try_text: string | null;
  nps: number | null;
  will_continue: 'yes' | 'no' | null;
}

/** Supabase row → Review 도메인 모델 */
export function mapRowToReview(row: SupabaseReviewRow): Review {
  return {
    reviewer: { uid: row.reviewer_id, nickname: row.reviewer_nickname ?? undefined },
    keep: row.keep_text ?? undefined,
    problem: row.problem_text ?? undefined,
    try: row.try_text ?? undefined,
    nps: row.nps ?? 0,
    willContinue: row.will_continue ?? 'no',
  };
}

/** Review 도메인 모델 → Supabase insert/upsert 행 (timestamp 제외) */
export function mapReviewToSupabaseRow(
  boardId: string,
  review: Review,
): Record<string, unknown> {
  return {
    id: review.reviewer.uid,
    board_id: boardId,
    reviewer_id: review.reviewer.uid,
    reviewer_nickname: review.reviewer.nickname || null,
    keep_text: review.keep || null,
    problem_text: review.problem || null,
    try_text: review.try || null,
    nps: review.nps ?? null,
    will_continue: review.willContinue ?? null,
  };
}

/**
 * 보드에 리뷰를 추가합니다.
 * @param boardId 보드 ID
 * @param userId 사용자 ID
 * @param nickname 사용자 닉네임 (옵션)
 * @param data 리뷰 데이터
 * @returns Promise<boolean> 성공 여부
 */
export async function addReviewToBoard(
  boardId: string,
  userId: string,
  nickname: string | undefined,
  data: JoinFormDataForActiveUser
): Promise<boolean> {
  try {
    if (!boardId || !userId) {
      console.warn('addReviewToBoard called with empty boardId or userId');
      return false;
    }

    const review: Review = {
      reviewer: {
        uid: userId,
        nickname: nickname
      },
      keep: data.keep,
      problem: data.problem,
      try: data.try,
      nps: data.nps,
      willContinue: data.willContinue,
    };

    await createReview(boardId, review);
    return true;
  } catch (error) {
    console.error(`Error adding review to board ${boardId} for user ${userId}:`, error);
    return false;
  }
}

/**
 * 리뷰를 생성합니다.
 * @param boardId 보드 ID
 * @param review 리뷰 객체
 * @returns Promise<void>
 */
export async function createReview(boardId: string, review: Review): Promise<void> {
  const supabase = getSupabaseClient();
  throwOnError(await supabase.from('reviews').upsert({
    ...mapReviewToSupabaseRow(boardId, review),
    created_at: new Date().toISOString(),
  }));
}

/**
 * 리뷰를 가져옵니다.
 * @param boardId 보드 ID
 * @param userId 사용자 ID
 * @returns Promise<Review | null> 리뷰 또는 null
 */
export async function getReview(boardId: string, userId: string): Promise<Review | null> {
  try {
    if (!boardId || !userId) {
      console.warn('getReview called with empty boardId or userId');
      return null;
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('board_id', boardId)
      .eq('reviewer_id', userId)
      .single();

    if (error || !data) return null;

    return mapRowToReview(data);
  } catch (error) {
    console.error(`Error getting review from board ${boardId} for user ${userId}:`, error);
    return null;
  }
}

/**
 * 보드의 모든 리뷰를 가져옵니다.
 * @param boardId 보드 ID
 * @returns Promise<Review[]> 리뷰 배열
 */
export async function getReviewsByBoard(boardId: string): Promise<Review[]> {
  try {
    if (!boardId) {
      console.warn('getReviewsByBoard called with empty boardId');
      return [];
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('board_id', boardId);

    if (error) {
      console.error(`Error getting reviews for board ${boardId}:`, error);
      return [];
    }

    return (data || []).map(mapRowToReview);
  } catch (error) {
    console.error(`Error getting reviews for board ${boardId}:`, error);
    return [];
  }
}
