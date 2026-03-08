import type { CompletionHighlight } from '@/post/hooks/useCompletionMessage';

const LONG_CONTENT_THRESHOLD = 250;

export function getTitleMessage(boardPostCountToBe: number): string {
  return `${boardPostCountToBe}번째 글 작성 완료`;
}

export function getContentMessage(contentLength: number): string {
  return contentLength >= LONG_CONTENT_THRESHOLD
    ? '글 정말 재미있어요! 계속 써주세요.'
    : '짧아도 괜찮아요! 매일 리듬을 만들어나가다보면 좋은 글은 알아서 나와요.';
}

export function getHighlight(boardPostCountToBe: number): CompletionHighlight {
  return { keywords: [`${boardPostCountToBe}번째`], color: 'purple' };
}
