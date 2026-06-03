import { useEffect } from 'react';
import type { Post } from '@/post/model/Post';

interface PostHelmetProps {
  post: Post;
  boardId: string | undefined;
  postId: string | undefined;
}

// Defaults mirror apps/web/index.html so SPA navigation away from a post
// restores the same tags a fresh load would render. `description` is absent
// from index.html — we leave it set rather than create-then-orphan it.
const DEFAULT_TITLE = '매일 글쓰기 프렌즈';
const DEFAULT_DESCRIPTION = '한달 동안 당신을 글쓰는 사람으로 만들어 드립니다';
const DEFAULT_IMAGE = '/writing_girl.png';
const DEFAULT_URL = 'https://dailywritingfriends.com';

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function applyDefaults(): void {
  document.title = DEFAULT_TITLE;
  upsertMeta('property', 'og:title', DEFAULT_TITLE);
  upsertMeta('property', 'og:description', DEFAULT_DESCRIPTION);
  upsertMeta('property', 'og:image', DEFAULT_IMAGE);
  upsertMeta('property', 'og:url', DEFAULT_URL);
  upsertMeta('name', 'twitter:title', DEFAULT_TITLE);
  upsertMeta('name', 'twitter:description', DEFAULT_DESCRIPTION);
  upsertMeta('name', 'twitter:image', DEFAULT_IMAGE);
}

// 메타 태그 설정 컴포넌트 — imperative document.head updates so we don't ship
// react-helmet-async (~5KB gzip) on the entry critical path. Cleanup restores
// the index.html defaults on unmount so SPA navigation away from a post detail
// page does not leave stale OG/Twitter tags pointing at the prior post.
export function PostMetaHelmet({ post, boardId, postId }: PostHelmetProps) {
  useEffect(() => {
    const url =
      boardId && postId
        ? `${DEFAULT_URL}/board/${boardId}/post/${postId}`
        : DEFAULT_URL;
    const title = post.title ?? DEFAULT_TITLE;
    const description =
      post.content?.replace(/<[^>]+>/g, '').slice(0, 100) ?? '상세 내용을 확인하세요.';
    const image = post.thumbnailImageURL || '/writing_girl.webp';

    document.title = `${title} | ${DEFAULT_TITLE}`;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:url', url);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);

    return applyDefaults;
  }, [post, boardId, postId]);

  return null;
}
