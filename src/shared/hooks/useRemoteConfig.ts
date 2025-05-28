// ⚠️ [중요] fetchAndActivate는 App.tsx에서 단 1회만 실행하세요!
// 이 훅에서는 오직 getValue로 Remote Config 값을 읽기만 합니다.
// 여러 컴포넌트에서 중복 fetch를 방지하기 위한 구조입니다.
import { getValue } from 'firebase/remote-config';
import { useState, useEffect } from 'react';
import { remoteConfig } from '@/firebase';

// Remote Config 기본값 설정
const 매글프_팁_게시판 = 'rW3Y3E2aEbpB0KqGiigd';

export const DEFAULT_CONFIG_VALUES = {
    active_board_id: 매글프_팁_게시판,
    upcoming_board_id: 매글프_팁_게시판
};

export function useRemoteConfig<T>(key: string, defaultValue: T): {
  value: T;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    // fetchAndActivate는 App.tsx에서만 실행! 여기서는 getValue만 사용
    const configValue = getValue(remoteConfig, key);
    try {
      if (configValue.asString().startsWith('[') || configValue.asString().startsWith('{')) {
        setValue(JSON.parse(configValue.asString()) as T);
      } else {
        setValue(configValue.asString() as unknown as T);
      }
    } catch {
      setValue(configValue.asString() as unknown as T);
    }
  }, [key]);

  // fetchAndActivate는 App.tsx에서만 실행하므로, isLoading/error는 항상 false/null
  return { value, isLoading: false, error: null, refetch: () => {} };
} 