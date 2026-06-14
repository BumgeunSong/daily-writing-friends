import { useEffect, useLayoutEffect } from 'react';
import { useNavigationType } from 'react-router-dom';

const SCROLL_STORAGE_PREFIX = 'route-scroll:';

/**
 * 라우트별 스크롤 복원. 라우트 컴포넌트 안에서 호출하면 그 컴포넌트가 사라질 때 현재
 * 스크롤 위치를 sessionStorage에 저장하고, POP으로 다시 마운트될 때 동기적으로 복원한다.
 *
 * React Router의 <ScrollRestoration />과 함께 사용해도 같은 값으로 수렴하므로 충돌이
 * 없다. View Transition과 함께 쓸 때 RR의 자동 복원이 누락되는 케이스를 보강하기 위해
 * 도입했다.
 */
export function useRouteScrollRestoration(key: string): void {
  const navigationType = useNavigationType();
  const storageKey = SCROLL_STORAGE_PREFIX + key;

  useEffect(() => {
    return () => {
      try {
        sessionStorage.setItem(storageKey, String(window.scrollY));
      } catch {
        // 시크릿 모드 등으로 sessionStorage가 막힌 경우 조용히 무시.
      }
    };
  }, [storageKey]);

  useLayoutEffect(() => {
    if (navigationType !== 'POP') return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved === null) return;
      const value = Number.parseInt(saved, 10);
      if (Number.isNaN(value)) return;
      window.scrollTo({ top: value, behavior: 'instant' });
    } catch {
      // ignore
    }
  }, [storageKey, navigationType]);
}
