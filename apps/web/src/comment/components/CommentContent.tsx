import { useEffect, useMemo, useRef } from 'react';
import { renderCommentContentHtml } from '@/shared/content/contentUtils';
import { useNavigate } from '@/shared/navigation';
import type { ProseMirrorDoc } from '@/shared/model/ProseMirror';

interface CommentContentProps {
  content: string;
  contentJson?: ProseMirrorDoc;
  className?: string;
}

/** Modifier/secondary clicks keep the browser's default anchor behavior (new tab, etc.). */
function isPlainLeftClick(event: MouseEvent): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * 댓글/답글 본문 렌더러. content_json이 있으면 멘션 chip을 보존하고, 멘션 클릭을
 * 가로채 프로필로 SPA 이동시킨다. 앵커에 실제 href가 있어 키보드·새 탭도 동작한다.
 *
 * 클릭 위임은 onClick prop 대신 ref+리스너로 건다. 정적 div에 onClick을 달면
 * a11y 규칙이 키보드 핸들러를 요구하지만, 실제 상호작용 요소는 내부 앵커라서다.
 */
export function CommentContent({ content, contentJson, className }: CommentContentProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const html = useMemo(
    () => renderCommentContentHtml(content, contentJson),
    [content, contentJson],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const uid = target.closest('a[data-user-id]')?.getAttribute('data-user-id');
      if (!uid || !isPlainLeftClick(event)) return;
      event.preventDefault();
      navigate(`/user/${encodeURIComponent(uid)}`);
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [navigate]);

  return (
    <div
      ref={containerRef}
      className={className}
      // Safe: html is sanitized by renderCommentContentHtml
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
