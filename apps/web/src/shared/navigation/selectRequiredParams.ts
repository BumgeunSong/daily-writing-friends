type RouteParams = Readonly<Record<string, string | undefined>>;

/**
 * Narrow a raw route-params bag to the subset of keys a page requires. A matched
 * dynamic segment is always a non-empty string, so an absent key means the route
 * was reached without that segment — a routing error. Returns null in that case
 * instead of casting `string | undefined` to a trusted `string`, so the caller
 * decides how to fail (error UI, redirect) rather than dereferencing undefined.
 */
export function selectRequiredParams<K extends string>(
  params: RouteParams,
  keys: readonly K[],
): Record<K, string> | null {
  const validated = {} as Record<K, string>;
  for (const key of keys) {
    const value = params[key];
    if (value === undefined) return null;
    validated[key] = value;
  }
  return validated;
}
