import { describe, expect, it, vi } from 'vitest';
import { runWhenOnline, shouldInitOptionalFirebaseServices } from './optional-services';

describe('shouldInitOptionalFirebaseServices', () => {
  const realKey = 'AIzaSyRealLookingKey';

  it('실제 키이고 에뮬레이터가 아니면 true를 반환한다', () => {
    expect(shouldInitOptionalFirebaseServices({ isEmulator: false, apiKey: realKey })).toBe(true);
  });

  it('에뮬레이터 모드면 false를 반환한다', () => {
    expect(shouldInitOptionalFirebaseServices({ isEmulator: true, apiKey: realKey })).toBe(false);
  });

  it.each([undefined, '', 'fake-api-key-for-e2e', 'FAKE-KEY'])(
    '키가 비었거나 가짜(%s)면 false를 반환한다',
    (apiKey) => {
      expect(shouldInitOptionalFirebaseServices({ isEmulator: false, apiKey })).toBe(false);
    },
  );
});

describe('runWhenOnline', () => {
  const setup = (isOnline: boolean) => {
    let listener: (() => void) | undefined;
    const env = {
      isOnline: () => isOnline,
      onceOnline: vi.fn((cb: () => void) => {
        listener = cb;
      }),
    };
    const fireOnline = () => {
      const current = listener;
      listener = undefined;
      current?.();
    };
    return { env, fireOnline };
  };

  it('온라인이면 즉시 한 번 실행하고 리스너를 등록하지 않는다', () => {
    const { env } = setup(true);
    const task = vi.fn();

    runWhenOnline(task, env);

    expect(task).toHaveBeenCalledTimes(1);
    expect(env.onceOnline).not.toHaveBeenCalled();
  });

  it('오프라인이면 실행하지 않고 online 이벤트 이후 한 번만 실행한다', () => {
    const { env, fireOnline } = setup(false);
    const task = vi.fn();

    runWhenOnline(task, env);
    expect(task).not.toHaveBeenCalled();

    fireOnline();
    fireOnline();

    expect(task).toHaveBeenCalledTimes(1);
  });

  it('작업이 던져도 호출자에게 전파하지 않는다', () => {
    const { env } = setup(true);

    expect(() =>
      runWhenOnline(() => {
        throw new Error('boom');
      }, env),
    ).not.toThrow();
  });
});
