import { Helmet } from "react-helmet-async";
import type { Post } from "@/post/model/Post";

interface PostHelmetProps {
    post: Post;
    boardId: string | undefined;
    postId: string | undefined;
}

// 메타 태그 설정 컴포넌트
export function PostMetaHelmet({ post, boardId, postId }: PostHelmetProps) {
    const url = boardId && postId ? `https://dailywritingfriends.com/board/${boardId}/post/${postId}` : 'https://dailywritingfriends.com';
    const meta = {
        title: post.title ?? '매일 글쓰기 프렌즈',
        description: post.content?.replace(/<[^>]+>/g, '').slice(0, 100) ?? '상세 내용을 확인하세요.',
        image: post.thumbnailImageURL || '/writing_girl.webp',
        url: url,
      };
      
    return (
      <Helmet>
        <title>{meta.title} | 매일 글쓰기 프렌즈</title>
        <meta name="description" content={meta.description} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:image" content={meta.image} />
        <meta property="og:url" content={meta.url} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:image" content={meta.image} />
      </Helmet>
    );
  }
  