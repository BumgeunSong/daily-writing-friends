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
