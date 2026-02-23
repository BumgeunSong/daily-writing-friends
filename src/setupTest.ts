import '@testing-library/jest-dom';
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect, vi } from 'vitest';

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
    } 
      return {
        message: () => `expected ${received} to be an empty element`,
        pass: false,
      };
    
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