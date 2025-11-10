import { Timestamp } from 'firebase-admin/firestore';

/**
 * 댓글 스타일 데이터 - 사용자의 댓글 작성 스타일 학습을 위한 데이터
 */
export interface CommentStyleData {
  id: string;
  userId: string;           // 댓글 작성자
  postId: string;          // 댓글이 달린 포스트
  boardId: string;         // 보드 ID

  // 포스트 작성자 정보
  authorId: string;        // 포스트 작성자 ID
  authorNickname: string;  // 포스트 작성자 닉네임

  // 댓글 데이터
  userComment: string;     // 사용자가 작성한 댓글 원문

  // 메타데이터
  createdAt: Timestamp;    // 댓글 작성 시간
  processedAt: Timestamp;  // 이 레코드 생성 시간
}

/**
 * 사용자 댓글 히스토리 (백필 시 사용)
 */
export interface UserCommentWithPost {
  commentId: string;
  commentContent: string;
  postId: string;
  postContent: string;
  boardId: string;
  authorId: string;
  authorNickname: string;
  createdAt: Timestamp;
}

/**
 * 백필 처리 결과
 */
export interface BackfillResult {
  userId: string;
  commentsProcessed: number;
  success: boolean;
  error?: string;
}