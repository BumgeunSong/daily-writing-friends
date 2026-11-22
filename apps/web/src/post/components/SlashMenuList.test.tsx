import { act, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { filterSlashMenuItems } from '@/post/utils/slashMenuItems';
import { SlashMenuList, type SlashMenuListHandle } from './SlashMenuList';

const arrowDown = () => ({ event: new KeyboardEvent('keydown', { key: 'ArrowDown' }) });
const activeTitle = () => screen.getByRole('option', { selected: true }).textContent;

function renderMenu(query: string) {
  const ref = createRef<SlashMenuListHandle>();
  const command = vi.fn();
  const view = render(<SlashMenuList ref={ref} items={filterSlashMenuItems(query)} query={query} command={command} />);
  const update = (nextQuery: string) =>
    view.rerender(<SlashMenuList ref={ref} items={filterSlashMenuItems(nextQuery)} query={nextQuery} command={command} />);
  return { ref, update };
}

describe('슬래시 메뉴 목록의 하이라이트', () => {
  it('검색어가 같은 채로 항목 배열만 새로 들어와도 고른 항목을 유지한다', () => {
    const { ref, update } = renderMenu('');
    act(() => void ref.current?.onKeyDown(arrowDown()));
    expect(activeTitle()).toBe('제목 1');

    update('');

    expect(activeTitle()).toBe('제목 1');
  });

  it('검색어가 바뀌면 첫 항목으로 돌아간다', () => {
    const { ref, update } = renderMenu('');
    act(() => void ref.current?.onKeyDown(arrowDown()));

    update('제목');

    expect(activeTitle()).toBe('제목 1');
    act(() => void ref.current?.onKeyDown(arrowDown()));
    update('인용');
    expect(activeTitle()).toBe('인용');
  });
});
