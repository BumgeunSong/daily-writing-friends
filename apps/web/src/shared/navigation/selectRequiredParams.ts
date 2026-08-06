type RouteParams = Readonly<Record<string, string | undefined>>;

/**
 * Narrow a raw route-params bag to the subset of keys a page requires. A required
 * key that is missing or empty means the route was reached without a usable
 * segment — a routing error. Returns null in that case instead of casting
 * `string | undefined` to a trusted `string`, so the caller decides how to fail
 * (error UI, redirect) rather than dereferencing an absent value.
 */
export function selectRequiredParams<K extends string>(
  params: RouteParams,
  keys: readonly K[],
): Record<K, string> | null {
  const validated = {} as Record<K, string>;
  for (const key of keys) {
    const value = params[key];
    if (!value) return null;
    validated[key] = value;
  }
  return validated;
}
