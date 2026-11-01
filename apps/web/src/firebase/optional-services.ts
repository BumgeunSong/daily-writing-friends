const PLACEHOLDER_API_KEY_PATTERN = /^fake/i;

/**
 * Analytics·Performance·Remote Config는 Installations를 통해 Google에 요청한다.
 * 에뮬레이터이거나 CI E2E처럼 가짜 키를 쓰는 환경에서는 400으로 실패하므로 초기화하지 않는다.
 */
export const shouldInitOptionalFirebaseServices = ({
  isEmulator,
  apiKey,
}: {
  isEmulator: boolean;
  apiKey: string | undefined;
}): boolean => {
  if (isEmulator) return false;
  if (!apiKey || PLACEHOLDER_API_KEY_PATTERN.test(apiKey)) return false;
  return true;
};

export interface OnlineEnvironment {
  isOnline: () => boolean;
  onceOnline: (callback: () => void) => void;
}

export const browserOnlineEnvironment: OnlineEnvironment = {
  isOnline: () => navigator.onLine,
  onceOnline: (callback) => window.addEventListener('online', callback, { once: true }),
};

/**
 * 오프라인에서 Installations가 SDK 내부 Promise를 reject하면 호출자가 잡을 수 없는
 * unhandled rejection이 되므로, 오프라인이면 online 이벤트까지 작업을 미룬다.
 */
export const runWhenOnline = (
  task: () => void,
  environment: OnlineEnvironment = browserOnlineEnvironment,
): void => {
  const safeTask = () => {
    try {
      task();
    } catch (error) {
      console.warn('Optional Firebase service not available:', error);
    }
  };

  if (environment.isOnline()) {
    safeTask();
    return;
  }
  environment.onceOnline(safeTask);
};
