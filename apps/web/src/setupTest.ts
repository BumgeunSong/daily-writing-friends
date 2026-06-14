import '@testing-library/jest-dom';
import * as matchers from '@testing-library/jest-dom/matchers';
import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest';
import { server } from './test/msw/server';
import { resetAuthHandlerState } from './test/msw/handlers/auth';

// Sentry 글로벌 mock — AuthProvider가 setSentryUser를 호출하므로 모든 컴포넌트 테스트에서 필요
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  captureException: vi.fn(),
  withScope: vi.fn((cb: (scope: Record<string, unknown>) => void) => cb({ setContext: vi.fn(), setFingerprint: vi.fn() })),
  addBreadcrumb: vi.fn(),
  startSpan: vi.fn((_ctx: unknown, cb: () => unknown) => cb()),
  wrapCreateBrowserRouterV6: vi.fn((createRouter: unknown) => createRouter),
  reactRouterV6BrowserTracingIntegration: vi.fn(),
}));

// React Testing Library의 DOM 매처 확장
expect.extend(matchers);

// 커스텀 매처 추가
expect.extend({
  toBeEmptyElement(received) {
    const pass = received && received.childNodes.length === 0;
    if (pass) {
      return {
        message: () => `expected ${received} not to be an empty element`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be an empty element`,
        pass: false,
      };
    }
  },
});

// ResizeObserver 모킹 (UI 컴포넌트에서 필요할 수 있음)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// 모바일 환경 테스트를 위한 matchMedia 모킹
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// IntersectionObserver 모킹 (무한 스크롤 등에 필요할 수 있음)
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// MSW 라이프사이클 — 통합 테스트(integration) 계층의 네트워크 가로채기.
// onUnhandledRequest: 'warn' 단계에서 시작해 누락 핸들러를 노출시키고,
// 후속 PR에서 'error'로 승격해 강제한다.
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  resetAuthHandlerState();
});
afterAll(() => server.close());
