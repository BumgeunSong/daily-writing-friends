import { firestore } from "@/firebase";
import { JoinFormDataForActiveUser } from "@/types/join";
import { Review } from "@/types/Review";
import { doc, setDoc, getDoc, collection, getDocs, Timestamp } from "firebase/firestore";

export async function addReviewToBoard(userId: string, boardId: string, nickname: string | undefined, data: JoinFormDataForActiveUser): Promise<void> {
    return await createReview(boardId, {
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
    })
}

export async function createReview(boardId: string, review: Review): Promise<void> {
  const reviewRef = doc(firestore, "boards", boardId, "reviews", review.reviewer.uid);
  await setDoc(reviewRef, review);
}

export async function getReview(boardId: string, userId: string): Promise<Review | null> {
  const reviewRef = doc(firestore, "boards", boardId, "reviews", userId);
  const reviewDoc = await getDoc(reviewRef);

  if (!reviewDoc.exists()) {
    return null;
  }

  return reviewDoc.data() as Review;
}

export async function getReviewsByBoard(boardId: string): Promise<Review[]> {
  const reviewsRef = collection(firestore, "boards", boardId, "reviews");
  const reviewsSnapshot = await getDocs(reviewsRef);

  return reviewsSnapshot.docs.map((doc) => {
    return doc.data() as Review;
  });
}
