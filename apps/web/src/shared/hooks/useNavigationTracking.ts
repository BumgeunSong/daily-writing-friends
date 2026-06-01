/**
 * Hook to track navigation for better error context.
 *
 * No-op: Sentry's BrowserTracingIntegration was stripped, so the breadcrumbs
 * + setSentryContext calls produced no actionable telemetry. The document
 * click/submit listeners fired on every interaction during LCP/FCP windows
 * with no observable benefit.
 */
export function useNavigationTracking(): void {
  // intentionally empty
}
