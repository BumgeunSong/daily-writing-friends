import { useState, useEffect } from 'react';
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';
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
  refetch: () => Promise<void>;
} {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 개발 환경에서 캐시 시간 설정 (0초)
      remoteConfig.settings.minimumFetchIntervalMillis = import.meta.env.DEV ? 0 : 1800000;
      remoteConfig.defaultConfig = DEFAULT_CONFIG_VALUES;
      
      // Remote Config 가져오기 및 활성화
      await fetchAndActivate(remoteConfig);
      
      // 지정된 키에 대한 값 가져오기
      const configValue = getValue(remoteConfig, key);
      
      // 값 파싱 및 상태 업데이트
      try {
        // 문자열이 JSON 형식인지 확인
        if (configValue.asString().startsWith('[') || configValue.asString().startsWith('{')) {
          const parsedValue = JSON.parse(configValue.asString()) as T;
          setValue(parsedValue);
        } else {
          // 그 외의 경우 문자열 그대로 사용
          setValue(configValue.asString() as unknown as T);
        }
      } catch (parseError) {
        console.error('Remote Config 값 파싱 실패:', parseError);
        // JSON 파싱 실패 시 문자열 그대로 사용
        setValue(configValue.asString() as unknown as T);
      }
    } catch (err) {
      console.error('Remote Config 가져오기 실패:', err);
      setError(err instanceof Error ? err : new Error('Remote Config 가져오기 실패'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [key]);

  return { value, isLoading, error, refetch: fetchConfig };
} 