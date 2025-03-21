import localforage from 'localforage';
import { Post } from '@/types/Posts';

// 캐시 스토어 설정
const postListStore = localforage.createInstance({
  name: 'post-list-cache',
  storeName: 'posts'
});

const postDetailStore = localforage.createInstance({
  name: 'post-detail-cache',
  storeName: 'post-details'
});

// 캐시 메타데이터 스토어
const cacheMetaStore = localforage.createInstance({
  name: 'cache-metadata',
  storeName: 'metadata'
});

// 게시물 목록 캐싱
export const cachePostList = async (boardId: string, posts: Post[]): Promise<void> => {
  try {
    const cacheKey = `board-${boardId}`;
    await postListStore.setItem(cacheKey, posts);
    
    // 메타데이터 저장
    await cacheMetaStore.setItem(cacheKey, {
      timestamp: Date.now(),
      size: JSON.stringify(posts).length
    });
    
    console.log(`게시물 목록 캐싱 완료: ${boardId}`);
  } catch (error) {
    console.error('게시물 목록 캐싱 실패:', error);
  }
};

// 캐시된 게시물 목록 가져오기
export const getCachedPostList = async (boardId: string): Promise<Post[] | null> => {
  try {
    const cacheKey = `board-${boardId}`;
    const posts = await postListStore.getItem<Post[]>(cacheKey);
    
    if (!posts) return null;
    
    // 메타데이터 확인
    const metadata = await cacheMetaStore.getItem<{timestamp: number}>(cacheKey);
    if (metadata) {
      // 24시간 이상 지난 캐시는 만료 처리
      const isExpired = Date.now() - metadata.timestamp > 24 * 60 * 60 * 1000;
      if (isExpired) {
        console.log(`만료된 캐시: ${cacheKey}`);
        return null;
      }
    }
    
    return posts;
  } catch (error) {
    console.error('캐시된 게시물 목록 가져오기 실패:', error);
    return null;
  }
};

// 게시물 상세 정보 캐싱
export const cachePostDetail = async (boardId: string, postId: string, post: Post): Promise<void> => {
  try {
    const cacheKey = `${boardId}-${postId}`;
    await postDetailStore.setItem(cacheKey, post);
    
    // 메타데이터 저장
    await cacheMetaStore.setItem(cacheKey, {
      timestamp: Date.now(),
      size: JSON.stringify(post).length
    });
    
    console.log(`게시물 상세 정보 캐싱 완료: ${cacheKey}`);
  } catch (error) {
    console.error('게시물 상세 정보 캐싱 실패:', error);
  }
};

// 캐시된 게시물 상세 정보 가져오기
export const getCachedPostDetail = async (boardId: string, postId: string): Promise<Post | null> => {
  try {
    const cacheKey = `${boardId}-${postId}`;
    const post = await postDetailStore.getItem<Post>(cacheKey);
    
    if (!post) return null;
    
    // 메타데이터 확인
    const metadata = await cacheMetaStore.getItem<{timestamp: number}>(cacheKey);
    if (metadata) {
      // 24시간 이상 지난 캐시는 만료 처리
      const isExpired = Date.now() - metadata.timestamp > 24 * 60 * 60 * 1000;
      if (isExpired) {
        console.log(`만료된 캐시: ${cacheKey}`);
        return null;
      }
    }
    
    return post;
  } catch (error) {
    console.error('캐시된 게시물 상세 정보 가져오기 실패:', error);
    return null;
  }
};

// 캐시 크기 계산
export const getCacheSize = async (): Promise<{ postList: number, postDetail: number }> => {
  try {
    let postListSize = 0;
    let postDetailSize = 0;
    
    // 게시물 목록 캐시 크기 계산
    const postListKeys = await postListStore.keys();
    for (const key of postListKeys) {
      const metadata = await cacheMetaStore.getItem<{size: number}>(`board-${key}`);
      if (metadata?.size) {
        postListSize += metadata.size;
      }
    }
    
    // 게시물 상세 캐시 크기 계산
    const postDetailKeys = await postDetailStore.keys();
    for (const key of postDetailKeys) {
      const metadata = await cacheMetaStore.getItem<{size: number}>(key);
      if (metadata?.size) {
        postDetailSize += metadata.size;
      }
    }
    
    return {
      postList: Math.round(postListSize / 1024), // KB 단위
      postDetail: Math.round(postDetailSize / 1024) // KB 단위
    };
  } catch (error) {
    console.error('캐시 크기 계산 실패:', error);
    return { postList: 0, postDetail: 0 };
  }
};

// 모든 캐시 삭제
export const clearAllCache = async (): Promise<void> => {
  try {
    await postListStore.clear();
    await postDetailStore.clear();
    await cacheMetaStore.clear();
    console.log('모든 캐시가 삭제되었습니다.');
  } catch (error) {
    console.error('캐시 삭제 실패:', error);
    throw error;
  }
};

// 특정 게시판의 캐시 무효화
export const invalidateBoardCache = async (boardId: string): Promise<void> => {
  try {
    const cacheKey = `board-${boardId}`;
    await postListStore.removeItem(cacheKey);
    await cacheMetaStore.removeItem(cacheKey);
    console.log(`게시판 캐시 무효화 완료: ${boardId}`);
  } catch (error) {
    console.error('게시판 캐시 무효화 실패:', error);
  }
};

// 네트워크 상태 확인
export const isOnline = (): boolean => {
  return navigator.onLine;
}; 