import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { sanitize } from '@/post/utils/sanitizeHtml';
import { renderPostBodyHtml, renderPostPreviewHtml } from '@/shared/content/contentUtils';
import { useTiptapEditor } from '../useTiptapEditor';

function publishedHtmlAfterUnderlining(text: string): string {
  const { result } = renderHook(() =>
    useTiptapEditor({ initialHtml: `<p>${text}</p>`, onChange: () => {} }),
  );
  const editor = result.current;
  if (!editor) throw new Error('editor not initialized');

  editor.chain().selectAll().toggleUnderline().run();

  return sanitize(editor.getHTML());
}

describe('에디터에서 밑줄을 적용한 글을 발행할 때', () => {
  it('문장 일부만 밑줄을 적용해도 그 구간만 u로 발행된다', () => {
    const { result } = renderHook(() =>
      useTiptapEditor({ initialHtml: '<p>가나다</p>', onChange: () => {} }),
    );
    const editor = result.current;
    if (!editor) throw new Error('editor not initialized');

    editor.chain().setTextSelection({ from: 2, to: 3 }).toggleUnderline().run();

    expect(sanitize(editor.getHTML())).toBe('<p>가<u>나</u>다</p>');
  });

  it('발행 HTML에 u 태그가 남는다', () => {
    const published = publishedHtmlAfterUnderlining('밑줄 글');

    expect(published).toBe('<p><u>밑줄 글</u></p>');
  });

  it('글 상세 본문 렌더에서도 밑줄이 유지된다', () => {
    const published = publishedHtmlAfterUnderlining('밑줄 글');

    expect(renderPostBodyHtml(published)).toBe('<p><u>밑줄 글</u></p>');
  });

  it('피드 카드 미리보기는 내용을 잃지 않고 밑줄을 유지한다', () => {
    const published = publishedHtmlAfterUnderlining('밑줄 글');

    expect(renderPostPreviewHtml(published)).toContain('<u>밑줄 글</u>');
  });
});
