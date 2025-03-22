import { openDB, IDBPDatabase } from 'idb';
import { Post } from '../types/Posts';
import { Comment } from '@/types/Comment';

// IndexedDB 데이터베이스 이름과 버전
const DB_NAME = 'offlineCache';
const DB_VERSION = 1;

// 데이터베이스 스토어 이름
const STORES = {
  POSTS: 'posts',
  POST_DETAILS: 'postDetails',
  COMMENTS: 'comments',
  REPLIES: 'replies',
};

// 데이터베이스 연결 함수
async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 게시물 목록 스토어
      if (!db.objectStoreNames.contains(STORES.POSTS)) {
        db.createObjectStore(STORES.POSTS, { keyPath: 'boardId' });
      }
      
      // 게시물 상세 스토어
      if (!db.objectStoreNames.contains(STORES.POST_DETAILS)) {
        db.createObjectStore(STORES.POST_DETAILS, { keyPath: 'id' });
      }
      
      // 댓글 스토어
      if (!db.objectStoreNames.contains(STORES.COMMENTS)) {
        db.createObjectStore(STORES.COMMENTS, { keyPath: 'id' });
      }
      
      // 답글 스토어
      if (!db.objectStoreNames.contains(STORES.REPLIES)) {
        db.createObjectStore(STORES.REPLIES, { keyPath: 'id' });
      }
    },
  });
}

// 오프라인 상태 확인 함수
export function isOnline(): boolean {
  return navigator.onLine;
}

// 게시물 목록 캐싱 함수
export async function cachePostList(boardId: string, posts: Post[]): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORES.POSTS, { boardId, posts, timestamp: Date.now() });
  } catch (error) {
    console.error('게시물 목록 캐싱 오류:', error);
  }
}

// 캐시된 게시물 목록 가져오기 함수
export async function getCachedPostList(boardId: string): Promise<Post[] | null> {
  try {
    const db = await getDB();
    const data = await db.get(STORES.POSTS, boardId);
    
    if (!data) return null;
    
    // 캐시가 24시간 이상 지났는지 확인
    const isStale = Date.now() - data.timestamp > 24 * 60 * 60 * 1000;
    if (isStale && isOnline()) return null;
    
    return data.posts;
  } catch (error) {
    console.error('캐시된 게시물 목록 가져오기 오류:', error);
    return null;
  }
}

// 게시물 상세 캐싱 함수
export async function cachePostDetail(boardId: string, postId: string, post: Post): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORES.POST_DETAILS, { 
      id: `${boardId}_${postId}`, 
      post, 
      timestamp: Date.now() 
    });
  } catch (error) {
    console.error('게시물 상세 캐싱 오류:', error);
  }
}

// 캐시된 게시물 상세 가져오기 함수
export async function getCachedPostDetail(boardId: string, postId: string): Promise<Post | null> {
  try {
    const db = await getDB();
    const data = await db.get(STORES.POST_DETAILS, `${boardId}_${postId}`);
    
    if (!data) return null;
    
    // 캐시가 24시간 이상 지났는지 확인
    const isStale = Date.now() - data.timestamp > 24 * 60 * 60 * 1000;
    if (isStale && isOnline()) return null;
    
    return data.post;
  } catch (error) {
    console.error('캐시된 게시물 상세 가져오기 오류:', error);
    return null;
  }
}

// 댓글 목록 캐싱 함수
export async function cacheComments(boardId: string, postId: string, comments: Comment[]): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORES.COMMENTS, { 
      id: `${boardId}_${postId}`, 
      comments, 
      timestamp: Date.now() 
    });
  } catch (error) {
    console.error('댓글 캐싱 오류:', error);
  }
}

// 캐시된 댓글 목록 가져오기 함수
export async function getCachedComments(boardId: string, postId: string): Promise<Comment[] | null> {
  try {
    const db = await getDB();
    const data = await db.get(STORES.COMMENTS, `${boardId}_${postId}`);
    
    if (!data) return null;
    
    // 캐시가 24시간 이상 지났는지 확인
    const isStale = Date.now() - data.timestamp > 24 * 60 * 60 * 1000;
    if (isStale && isOnline()) return null;
    
    return data.comments;
  } catch (error) {
    console.error('캐시된 댓글 가져오기 오류:', error);
    return null;
  }
}

// 답글 목록 캐싱 함수
export async function cacheReplies(boardId: string, postId: string, commentId: string, replies: Comment[]): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORES.REPLIES, { 
      id: `${boardId}_${postId}_${commentId}`, 
      replies, 
      timestamp: Date.now() 
    });
  } catch (error) {
    console.error('답글 캐싱 오류:', error);
  }
}

// 캐시된 답글 목록 가져오기 함수
export async function getCachedReplies(boardId: string, postId: string, commentId: string): Promise<Comment[] | null> {
  try {
    const db = await getDB();
    const data = await db.get(STORES.REPLIES, `${boardId}_${postId}_${commentId}`);
    
    if (!data) return null;
    
    // 캐시가 24시간 이상 지났는지 확인
    const isStale = Date.now() - data.timestamp > 24 * 60 * 60 * 1000;
    if (isStale && isOnline()) return null;
    
    return data.replies;
  } catch (error) {
    console.error('캐시된 답글 가져오기 오류:', error);
    return null;
  }
}

// 캐시 데이터 정리 함수 (오래된 캐시 삭제)
export async function cleanupCache(): Promise<void> {
  try {
    const db = await getDB();
    const storeNames = [STORES.POSTS, STORES.POST_DETAILS, STORES.COMMENTS, STORES.REPLIES];
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7일
    
    for (const storeName of storeNames) {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const keys = await store.getAllKeys();
      
      for (const key of keys) {
        const item = await store.get(key);
        if (Date.now() - item.timestamp > maxAge) {
          await store.delete(key);
        }
      }
      
      await tx.done;
    }
  } catch (error) {
    console.error('캐시 정리 오류:', error);
  }
}

// 네트워크 상태 변경 이벤트 리스너 설정
export function setupNetworkListeners(onOnline: () => void, onOffline: () => void): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  // 정리 함수 반환
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

// 주기적으로 캐시 정리 실행 (앱 시작 시 호출)
export function startCacheCleanupSchedule(): void {
  // 앱 시작 시 한 번 실행
  cleanupCache();
  
  // 24시간마다 실행
  setInterval(cleanupCache, 24 * 60 * 60 * 1000);
} 