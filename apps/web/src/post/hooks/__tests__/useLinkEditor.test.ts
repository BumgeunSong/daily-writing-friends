import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useLinkEditor } from '../useLinkEditor';
import { useTiptapEditor } from '../useTiptapEditor';

function setup(html: string, selection: { from: number; to: number }) {
  const { result: editorResult } = renderHook(() =>
    useTiptapEditor({ initialHtml: html, onChange: () => {} }),
  );
  const editor = editorResult.current!;
  act(() => {
    editor.commands.setTextSelection(selection);
  });
  const { result } = renderHook(() => useLinkEditor(editor));
  return { editor, link: result };
}

describe('useLinkEditor', () => {
  it('열면 현재 선택 영역의 링크 URL로 입력값을 채운다', () => {
    const { link } = setup('<p><a href="https://a.com">링크</a></p>', { from: 1, to: 3 });

    act(() => link.current.open());

    expect(link.current.isOpen).toBe(true);
    expect(link.current.linkUrl).toBe('https://a.com');
  });

  it('링크가 없는 선택 영역에서 열면 입력값이 비어 있다', () => {
    const { link } = setup('<p>글자</p>', { from: 1, to: 3 });

    act(() => link.current.open());

    expect(link.current.linkUrl).toBe('');
  });

  it('유효한 https URL을 적용하면 선택 영역에 링크가 걸리고 닫힌다', () => {
    const { editor, link } = setup('<p>글자</p>', { from: 1, to: 3 });
    act(() => link.current.open());
    act(() => link.current.setLinkUrl('https://example.com'));

    act(() => link.current.apply());

    expect(editor.getHTML()).toContain('href="https://example.com"');
    expect(link.current.isOpen).toBe(false);
    expect(link.current.linkUrl).toBe('');
  });

  it('한글 텍스트 선택 영역에도 링크가 걸린다', () => {
    const { editor, link } = setup('<p>안녕하세요</p>', { from: 1, to: 4 });
    act(() => link.current.open());
    act(() => link.current.setLinkUrl('https://example.com'));

    act(() => link.current.apply());

    expect(editor.getHTML()).toContain('>안녕하</a>세요');
  });

  it('프로토콜 없는 URL은 거부하고 링크를 걸지 않는다', () => {
    const { editor, link } = setup('<p>글자</p>', { from: 1, to: 3 });
    act(() => link.current.open());
    act(() => link.current.setLinkUrl('example.com'));

    act(() => link.current.apply());

    expect(editor.getHTML()).not.toContain('<a ');
  });

  it('javascript: 같은 허용되지 않은 스킴은 거부한다', () => {
    const { editor, link } = setup('<p>글자</p>', { from: 1, to: 3 });
    act(() => link.current.open());
    act(() => link.current.setLinkUrl('javascript:alert(1)'));

    act(() => link.current.apply());

    expect(editor.getHTML()).not.toContain('<a ');
  });

  it('입력값을 비우고 적용하면 기존 링크를 해제한다', () => {
    const { editor, link } = setup('<p><a href="https://a.com">링크</a></p>', { from: 1, to: 3 });
    act(() => link.current.open());
    act(() => link.current.setLinkUrl(''));

    act(() => link.current.apply());

    expect(editor.getHTML()).not.toContain('<a ');
  });

  it('취소하면 링크를 바꾸지 않고 닫는다', () => {
    const { editor, link } = setup('<p>글자</p>', { from: 1, to: 3 });
    act(() => link.current.open());
    act(() => link.current.setLinkUrl('https://example.com'));

    act(() => link.current.cancel());

    expect(editor.getHTML()).not.toContain('<a ');
    expect(link.current.isOpen).toBe(false);
    expect(link.current.linkUrl).toBe('');
  });

  it('http로 시작하지 않는 잘못된 입력에서만 프로토콜 안내를 보인다', () => {
    const { link } = setup('<p>글자</p>', { from: 1, to: 3 });

    expect(link.current.showProtocolHint).toBe(false);
    act(() => link.current.setLinkUrl('example.com'));
    expect(link.current.showProtocolHint).toBe(true);
    act(() => link.current.setLinkUrl('https://example.com'));
    expect(link.current.showProtocolHint).toBe(false);
    act(() => link.current.setLinkUrl('http'));
    expect(link.current.showProtocolHint).toBe(false);
  });
});
