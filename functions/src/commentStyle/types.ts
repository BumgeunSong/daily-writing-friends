import { Timestamp } from 'firebase-admin/firestore';

/**
 * 작성자의 글쓰기 스타일/접근 방식을 나타내는 톤 유형
 */
export type PostTone = 
  | 'thoughtful'    // 사려 깊은: 깊은 생각과 배려를 담은 톤
  | 'warm'          // 따뜻한: 친절하고 다정한 톤
  | 'emotional'     // 감정적인: 감정을 강하게 표현하는 톤
  | 'humorous'      // 유머러스한: 재미있고 가벼운 톤
  | 'serious'       // 진지한: 중요한 주제를 다루는 톤
  | 'informal'      // 비공식적인: 친구와의 대화 같은 톤
  | 'formal'        // 공식적인: 전문적이고 비즈니스 톤
  | 'optimistic'    // 낙관적인: 긍정적이고 희망적인 톤
  | 'calm'          // 평화로운: 차분하고 평온한 톤
  | 'guiding'       // 안내하는: 단계별로 안내하는 톤
  | 'friendly';     // 우호적인: 친근하고 우정 어린 톤

/**
 * 글의 정서적 분위기를 나타내는 무드 유형
 */
export type PostMood = 
  | 'happy_uplifting'      // Happy and Uplifting: 기쁨, 희망적인 전망
  | 'sad_gloomy'           // Sad or Gloomy: 우울, 외로움, 슬픔
  | 'tense_exciting'       // Tense and Exciting: 긴장감, 흥미진진함, 서스펜스
  | 'romantic_loving'      // Romantic and Loving: 깊은 유대감, 애정, 열정
  | 'mysterious_curious'   // Mysterious and Curious: 호기심, 탐구심 유발
  | 'funny_lighthearted'   // Funny and Lighthearted: 유머로 즐거움 제공
  | 'peaceful_calm';       // Peaceful and Calm: 평온하고 고요한 분위기

/**
 * 댓글 스타일 데이터 - 사용자의 댓글 작성 스타일 학습을 위한 데이터
 */
export interface CommentStyleData {
  id: string;
  userId: string;           // 댓글 작성자
  postId: string;          // 댓글이 달린 포스트
  boardId: string;         // 보드 ID
  
  // LLM 분석 결과
  postSummary: string;     // 50자 이내 포스트 요약
  postTone: PostTone;      // 작성자의 글쓰기 스타일
  postMood: PostMood;      // 글의 정서적 분위기
  
  // 댓글 데이터
  userComment: string;     // 사용자가 작성한 댓글 원문
  
  // 메타데이터
  createdAt: Timestamp;    // 댓글 작성 시간
  processedAt: Timestamp;  // 이 레코드 생성 시간
}

/**
 * 포스트 처리 캐시 - 동일한 포스트에 대한 중복 LLM 호출을 방지
 */
export interface PostProcessingCache {
  postId: string;
  summary: string;         // 50자 이내 요약
  tone: PostTone;         // 작성 톤
  mood: PostMood;         // 정서적 무드
  processedAt: Timestamp; // 처리 시간
}

/**
 * LLM 응답 구조
 */
export interface LLMAnalysisResult {
  summary: string;
  tone: PostTone;
  mood: PostMood;
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