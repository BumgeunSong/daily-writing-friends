import { JoinFormDataForActiveUser } from "@/login/model/join";
import { Review } from "@/login/model/Review";
import { getSupabaseClient, throwOnError } from "@/shared/api/supabaseClient";

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
    id: review.reviewer.uid,
    board_id: boardId,
    reviewer_id: review.reviewer.uid,
    reviewer_nickname: review.reviewer.nickname || null,
    keep_text: review.keep || null,
    problem_text: review.problem || null,
    try_text: review.try || null,
    nps: review.nps ?? null,
    will_continue: review.willContinue ?? null,
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

    return {
      reviewer: { uid: data.reviewer_id, nickname: data.reviewer_nickname },
      keep: data.keep_text,
      problem: data.problem_text,
      try: data.try_text,
      nps: data.nps,
      willContinue: data.will_continue,
    };
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

    return (data || []).map(row => ({
      reviewer: { uid: row.reviewer_id, nickname: row.reviewer_nickname },
      keep: row.keep_text,
      problem: row.problem_text,
      try: row.try_text,
      nps: row.nps,
      willContinue: row.will_continue,
    }));
  } catch (error) {
    console.error(`Error getting reviews for board ${boardId}:`, error);
    return [];
  }
}
