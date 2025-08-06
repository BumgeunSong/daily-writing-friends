import * as Sentry from '@sentry/react';
import { AlertCircle, Lock } from 'lucide-react';
import { useEffect, useRef, useCallback } from 'react';
import { useCopyHandler } from '@/post/hooks/useCopyHandler';
import { Post, PostVisibility } from '@/post/model/Post';
import { sanitizePostContent } from '@/post/utils/contentUtils';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { CopyErrorBoundary } from './CopyErrorBoundary';

// PostContent 컴포넌트
interface PostContentProps {
    post: Post;
    isAuthor: boolean;
}

export function PostContent({ post, isAuthor }: PostContentProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const isPrivateAndNotAuthor = post.visibility === PostVisibility.PRIVATE && !isAuthor;
    const isPrivateAndAuthor = post.visibility === PostVisibility.PRIVATE && isAuthor;

    // 선택된 HTML을 가져오는 함수
    const getSelectedHtml = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.toString().length === 0) return '';
        
        const range = selection.getRangeAt(0);
        const clonedSelection = range.cloneContents();
        const div = document.createElement('div');
        div.appendChild(clonedSelection);
        return div.innerHTML;
    }, []);

    // 커스텀 복사 핸들러 적용
    useCopyHandler(getSelectedHtml, contentRef.current);

    if (!post?.content) {
        return <p>내용이 없습니다.</p>;
    }

    if (isPrivateAndNotAuthor) {
        return (
            <div className="my-6 rounded-lg border border-gray-200 bg-gray-100 p-8 text-center">
                <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-gray-200">
                    <Lock className="size-8 text-gray-600" />
                </div>
                <p className="mb-4 text-gray-600">
                    이 글은 작성자만 볼 수 있어요.
                </p>
            </div>
        );
    }

    try {
        const sanitizedContent = sanitizePostContent(post.content);
        return (
            <CopyErrorBoundary>
                <div className="relative">
                    {isPrivateAndAuthor && (
                        <div className="mb-4 flex items-center">
                            <span className="inline-flex items-center rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 ring-1 ring-inset ring-gray-300">
                                <Lock className="mr-1 size-3" /> 비공개 글
                            </span>
                        </div>
                    )}
                    <div
                        ref={contentRef}
                        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                        className="prose prose-lg prose-slate mt-6 max-w-none dark:prose-invert
                            prose-h1:text-3xl prose-h1:font-semibold 
                            prose-h2:text-2xl prose-h2:font-semibold
                            prose-p:my-2
                            prose-ol:my-4
                            prose-ul:my-4
                        "
                    />
                </div>
            </CopyErrorBoundary>
        );
    } catch (error) {
        const err = error instanceof Error ? error : new Error('알 수 없는 렌더링 오류가 발생했습니다.');

        Sentry.captureException(err, {
            extra: { postId: post.id },
        });

        return (
            <Alert variant="destructive" className="my-4">
                <AlertCircle className="size-4" />
                <AlertTitle>렌더링 오류</AlertTitle>
                <AlertDescription className="mt-2">
                    <p>콘텐츠를 화면에 표시하는 중에 문제가 발생했습니다:</p>
                    <p className="mt-1 rounded bg-red-50 p-2 font-mono text-sm">
                        {err.message}
                    </p>
                    <p className="mt-2 text-sm">
                        페이지를 새로고침하거나 나중에 다시 시도해주세요.
                        문제가 계속되면 관리자에게 문의해주세요.
                    </p>
                </AlertDescription>
            </Alert>
        );
    }
}
