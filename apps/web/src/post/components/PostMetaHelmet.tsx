import { useEffect } from 'react';
import type { Post } from '@/post/model/Post';

interface PostHelmetProps {
  post: Post;
  boardId: string | undefined;
  postId: string | undefined;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

// 메타 태그 설정 컴포넌트 — imperative document.head updates so we don't ship
// react-helmet-async (~5KB gzip) on the entry critical path.
export function PostMetaHelmet({ post, boardId, postId }: PostHelmetProps) {
  useEffect(() => {
    const url =
      boardId && postId
        ? `https://dailywritingfriends.com/board/${boardId}/post/${postId}`
        : 'https://dailywritingfriends.com';
    const title = post.title ?? '매일 글쓰기 프렌즈';
    const description =
      post.content?.replace(/<[^>]+>/g, '').slice(0, 100) ?? '상세 내용을 확인하세요.';
    const image = post.thumbnailImageURL || '/writing_girl.webp';

    document.title = `${title} | 매일 글쓰기 프렌즈`;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:url', url);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);
  }, [post, boardId, postId]);

  return null;
}
