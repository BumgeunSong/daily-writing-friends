import { afterEach, describe, expect, it, vi } from 'vitest';
import { isComposingKey, resolveSlashMenuPlacement } from './slashCommandExtension';

const keydown = (init: KeyboardEventInit & { keyCode?: number }) =>
  new KeyboardEvent('keydown', { key: 'Enter', ...init });

describe('조합 키 판단', () => {
  it('뷰가 조합 중이면 키 이벤트에 표시가 없어도 조합 키다', () => {
    expect(isComposingKey(keydown({}), true)).toBe(true);
  });

  it('event.isComposing이 켜져 있으면 조합 키다', () => {
    expect(isComposingKey(keydown({ isComposing: true }), false)).toBe(true);
  });

  it('keyCode가 229이면 조합 키다', () => {
    expect(isComposingKey(keydown({ keyCode: 229 }), false)).toBe(true);
  });

  it('조합 표시가 없는 일반 Enter는 조합 키가 아니다', () => {
    expect(isComposingKey(keydown({ keyCode: 13 }), false)).toBe(false);
  });
});

describe('메뉴 위치 결정', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('좁은 화면이면 커서 위쪽을 먼저 노린다', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(resolveSlashMenuPlacement()).toBe('top-start');
  });

  it('넓은 화면이면 커서 아래쪽을 먼저 노린다', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(resolveSlashMenuPlacement()).toBe('bottom-start');
  });

  it('matchMedia가 없는 환경에서도 던지지 않고 아래쪽으로 둔다', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(resolveSlashMenuPlacement()).toBe('bottom-start');
  });
});
