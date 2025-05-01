import { doc, setDoc, getDoc, collection, getDocs, Timestamp } from "firebase/firestore";
import { firestore } from "@/firebase";
import { JoinFormDataForActiveUser } from "@/types/join";
import { Review } from "@/types/Review";

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
      createdAt: Timestamp.now()
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
  const reviewRef = doc(firestore, "boards", boardId, "reviews", review.reviewer.uid);
  await setDoc(reviewRef, review);
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
    
    const reviewRef = doc(firestore, "boards", boardId, "reviews", userId);
    const reviewDoc = await getDoc(reviewRef);

    if (!reviewDoc.exists()) {
      return null;
    }

    return reviewDoc.data() as Review;
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
    
    const reviewsRef = collection(firestore, "boards", boardId, "reviews");
    const reviewsSnapshot = await getDocs(reviewsRef);

    return reviewsSnapshot.docs.map((doc) => doc.data() as Review);
  } catch (error) {
    console.error(`Error getting reviews for board ${boardId}:`, error);
    return [];
  }
}
