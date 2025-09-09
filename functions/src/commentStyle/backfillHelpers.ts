import { UserCommentWithPost } from './types';
import admin from '../shared/admin';

/**
 * 특정 사용자의 최근 댓글을 포스트 정보와 함께 조회
 * 백필 처리를 위한 헬퍼 함수
 */
export async function getUserRecentCommentsWithPosts(
  userId: string,
  limit = 10,
): Promise<UserCommentWithPost[]> {
  try {
    console.log(`Fetching last ${limit} comments for user ${userId}`);

    // 사용자의 최근 댓글 조회 (commentings 컬렉션 사용)
    const commentingsSnapshot = await admin
      .firestore()
      .collection(`users/${userId}/commentings`)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    if (commentingsSnapshot.empty) {
      console.log(`No comments found for user ${userId}`);
      return [];
    }

    const results: UserCommentWithPost[] = [];

    // 각 commenting 레코드에 대해 실제 댓글과 포스트 데이터를 조회
    for (const commentingDoc of commentingsSnapshot.docs) {
      try {
        const commenting = commentingDoc.data();
        const boardId = commenting.board.id;
        const postId = commenting.post.id;
        const commentId = commenting.comment.id;

        // 실제 댓글 데이터 조회
        const commentDoc = await admin
          .firestore()
          .doc(`boards/${boardId}/posts/${postId}/comments/${commentId}`)
          .get();

        if (!commentDoc.exists) {
          console.warn(`Comment ${commentId} not found, skipping`);
          continue;
        }

        const commentData = commentDoc.data();

        // 포스트 데이터 조회
        const postDoc = await admin.firestore().doc(`boards/${boardId}/posts/${postId}`).get();

        if (!postDoc.exists) {
          console.warn(`Post ${postId} not found, skipping comment ${commentId}`);
          continue;
        }

        const postData = postDoc.data();

        // 셀프 댓글 제외 (본인 포스트에 본인이 댓글)
        if (postData!.authorId === userId) {
          console.log(`Skipping self-comment: user ${userId} commenting on own post ${postId}`);
          continue;
        }

        results.push({
          commentId: commentId,
          commentContent: commentData!.content,
          postId: postId,
          postContent: postData!.content,
          boardId: boardId,
          authorId: postData!.authorId,
          authorNickname: postData!.authorName,
          createdAt: commenting.createdAt,
        });
      } catch (error) {
        console.error('Error processing commenting record:', commentingDoc.id, error);
        continue;
      }
    }

    console.log(`Retrieved ${results.length} comments with post data for user ${userId}`);
    return results;
  } catch (error) {
    console.error(`Error getting recent comments for user ${userId}:`, error);
    return [];
  }
}

/**
 * 중복 포스트 ID를 제거하고 고유한 포스트 내용만 추출
 * LLM 처리 비용 최적화를 위해 사용
 */
export function getUniquePostContents(
  comments: UserCommentWithPost[],
): Array<{ postId: string; content: string }> {
  const uniquePosts = new Map<string, string>();

  comments.forEach((comment) => {
    if (!uniquePosts.has(comment.postId)) {
      uniquePosts.set(comment.postId, comment.postContent);
    }
  });

  return Array.from(uniquePosts.entries()).map(([postId, content]) => ({
    postId,
    content,
  }));
}

/**
 * 백필 진행률 추적을 위한 유틸리티
 */
export class BackfillProgress {
  private totalUsers = 0;
  private processedUsers = 0;
  private totalComments = 0;
  private processedComments = 0;
  private errors: string[] = [];

  constructor(totalUsers: number) {
    this.totalUsers = totalUsers;
  }

  incrementProcessedUsers(): void {
    this.processedUsers++;
  }

  addProcessedComments(count: number): void {
    this.processedComments += count;
    this.totalComments += count;
  }

  addError(error: string): void {
    this.errors.push(error);
  }

  getProgress(): {
    totalUsers: number;
    processedUsers: number;
    userProgress: string;
    totalComments: number;
    processedComments: number;
    errors: number;
    success: boolean;
  } {
    return {
      totalUsers: this.totalUsers,
      processedUsers: this.processedUsers,
      userProgress: `${this.processedUsers}/${this.totalUsers} (${Math.round((this.processedUsers / this.totalUsers) * 100)}%)`,
      totalComments: this.totalComments,
      processedComments: this.processedComments,
      errors: this.errors.length,
      success: this.errors.length < this.totalUsers * 0.1, // 10% 미만 에러율이면 성공
    };
  }

  logProgress(): void {
    const progress = this.getProgress();
    console.log(
      `Backfill Progress: Users ${progress.userProgress}, Comments: ${progress.totalComments}, Errors: ${progress.errors}`,
    );
  }
}
