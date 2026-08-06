// eslint-disable-next-line no-restricted-imports -- 이 모듈이 라우팅 초크포인트다. 파라미터 접근은 여기서만 react-router-dom을 직접 참조한다.
import { useParams } from 'react-router-dom';
import { selectRequiredParams } from './selectRequiredParams';

/**
 * Read required route params through the navigation chokepoint. Returns the
 * narrowed `{ [key]: string }` when every requested key is present, or null when
 * any is missing — the honest boundary for `useParams`, whose raw values are
 * really `string | undefined` regardless of the type argument callers pass.
 */
export function useValidatedParams<K extends string>(...keys: K[]): Record<K, string> | null {
  return selectRequiredParams(useParams(), keys);
}
