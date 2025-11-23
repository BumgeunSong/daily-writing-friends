import { useRef } from 'react';

/**
 * 전달받은 값의 이전 값을 ref로 추적하여 반환하는 훅
 * @param value 추적할 값
 * @returns 이전 값이 저장된 ref 객체
 */
export function usePreviousValue<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
} 