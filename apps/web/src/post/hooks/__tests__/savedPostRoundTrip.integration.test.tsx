import { renderHook } from '@testing-library/react';
import type { Editor } from '@tiptap/react';
import { describe, it, expect, vi } from 'vitest';
import { sanitize } from '@/post/utils/sanitizeHtml';
import {
  FIXTURE_ALL_FORMATS,
  FIXTURE_EMPTY,
  FIXTURE_KOREAN_MIXED,
  FIXTURE_REAL_POST,
  FIXTURE_WITH_IMAGES,
} from '@/test/fixtures/editorHtmlFixtures';
import { useTiptapEditor } from '../useTiptapEditor';

function openPost(html: string): Editor {
  const { result } = renderHook(() => useTiptapEditor({ initialHtml: html, onChange: vi.fn() }));
  if (!result.current) throw new Error('editor not initialized');
  return result.current;
}

/** 에디터가 저장하는 경로(getHTML → sanitize)를 거친 HTML. */
const savedHtml = (editor: Editor) => sanitize(editor.getHTML());

describe('저장된 글을 에디터로 열고 편집 없이 다시 저장할 때', () => {
  it.each([
    ['제목', '<h1>Heading 1</h1>'],
    ['소제목', '<h2>Heading 2</h2>'],
    ['굵게', '<strong>Bold text</strong>'],
    ['기울임', '<em>italic text</em>'],
    ['취소선', '<s>strikethrough text</s>'],
    ['글머리 목록', '<ul><li><p>Bullet item 1</p></li>'],
    ['번호 목록', '<ol><li><p>Ordered item 1</p></li>'],
    ['인용', '<blockquote><p>A blockquote paragraph</p></blockquote>'],
  ])('%s 서식이 그대로 남는다', (_name, expected) => {
    expect(savedHtml(openPost(FIXTURE_ALL_FORMATS))).toContain(expected);
  });

  it('target과 rel이 없는 옛 링크도 새 탭에서 안전하게 열리도록 저장된다', () => {
    const html = savedHtml(openPost('<p><a href="https://example.com">링크</a></p>'));

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('실제 글의 소제목, 목록, 인용, 링크가 모두 남는다', () => {
    const html = savedHtml(openPost(FIXTURE_REAL_POST));

    expect(html).toContain('<h2>오늘 하루를 돌아보며</h2>');
    expect(html).toContain('<strong>감사한 것들:</strong>');
    expect(html).toContain('따뜻한 커피 한 잔');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('href="https://example.com/writing-tips"');
  });

  it('한글과 영어, 특수문자가 섞인 본문이 글자 그대로 남는다', () => {
    const text = openPost(FIXTURE_KOREAN_MIXED).getText();

    expect(text).toContain('오늘의 글쓰기 주제는 "행복"입니다.');
    expect(text).toContain('Writing about happiness (행복) is therapeutic.');
    expect(text).toContain('괄호() 슬래시/ 마침표... 쉼표, 느낌표! 물음표?');
    expect(text).toContain('볼드 한글');
  });

  it('본문 이미지는 한 장이 그대로 남는다', () => {
    const html = savedHtml(openPost(FIXTURE_WITH_IMAGES));

    expect(html.match(/<img /g)).toHaveLength(1);
  });

  it('빈 글은 빈 에디터로 열린다', () => {
    expect(openPost(FIXTURE_EMPTY).isEmpty).toBe(true);
  });

  it('밑줄은 에디터에서 그대로 보인다', () => {
    expect(openPost(FIXTURE_ALL_FORMATS).getHTML()).toContain('<u>underlined text</u>');
  });

  it.todo('밑줄은 저장 HTML에도 남는다');
});
