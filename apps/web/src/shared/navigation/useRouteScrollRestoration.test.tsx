import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRouteScrollRestoration } from './useRouteScrollRestoration';

const useNavigationTypeMock = vi.fn<() => 'POP' | 'PUSH' | 'REPLACE'>();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigationType: () => useNavigationTypeMock(),
  };
});

describe('useRouteScrollRestoration', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useNavigationTypeMock.mockReset();
    vi.restoreAllMocks();
  });

  it('POP으로 돌아오면 저장된 스크롤을 복원한다', () => {
    useNavigationTypeMock.mockReturnValue('POP');
    window.sessionStorage.setItem('route-scroll:board-29', '240');
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    renderHook(() => useRouteScrollRestoration('board-29'));

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 240, behavior: 'instant' });
  });

  it('PUSH 진입은 기본으로 복원하지 않는다', () => {
    useNavigationTypeMock.mockReturnValue('PUSH');
    window.sessionStorage.setItem('route-scroll:board-29', '240');
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    renderHook(() => useRouteScrollRestoration('board-29'));

    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('restoreOnMount가 true면 PUSH 진입에서도 복원한다', () => {
    useNavigationTypeMock.mockReturnValue('PUSH');
    window.sessionStorage.setItem('route-scroll:board-29', '240');
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    renderHook(() => useRouteScrollRestoration('board-29', { restoreOnMount: true }));

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 240, behavior: 'instant' });
  });
});
