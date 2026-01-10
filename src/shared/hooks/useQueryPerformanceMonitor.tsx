import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { addSentryBreadcrumb } from '@/sentry';
import { getQueryPerformanceStats } from '@/shared/lib/queryErrorTracking';

interface QueryPerformanceData {
  activeQueries: number;
  slowQueries: Array<{ queryKey: string; duration: number }>;
  cacheSize: number;
  staleQueries: number;
}

/**
 * Hook to monitor React Query performance in development
 */
export function useQueryPerformanceMonitor(enabled = false) {
  const queryClient = useQueryClient();
  const [performanceData, setPerformanceData] = useState<QueryPerformanceData>({
    activeQueries: 0,
    slowQueries: [],
    cacheSize: 0,
    staleQueries: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();

      const stats = getQueryPerformanceStats();
      const staleQueries = queries.filter(q => q.isStale()).length;
      const activeQueries = queries.filter(q => q.isFetching()).length;

      setPerformanceData({
        activeQueries,
        slowQueries: stats.slowQueries,
        cacheSize: queries.length,
        staleQueries,
      });

      // Log slow queries to Sentry in production
      if (!import.meta.env.DEV && stats.slowQueries.length > 0) {
        stats.slowQueries.forEach(slowQuery => {
          addSentryBreadcrumb(
            `Slow query detected: ${JSON.stringify(slowQuery.queryKey)}`,
            'performance',
            {
              queryKey: slowQuery.queryKey,
              duration: slowQuery.duration,
            },
            'warning'
          );
        });
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [enabled, queryClient]);

  return performanceData;
}

/**
 * Component to display query performance in development
 */
export function QueryPerformanceMonitor() {
  const performanceData = useQueryPerformanceMonitor(import.meta.env.DEV);

  if (!import.meta.env.DEV) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        maxWidth: '300px',
      }}
    >
      <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>React Query Monitor</div>
      <div>Active: {performanceData.activeQueries}</div>
      <div>Cache Size: {performanceData.cacheSize}</div>
      <div>Stale: {performanceData.staleQueries}</div>
      {performanceData.slowQueries.length > 0 && (
        <div style={{ marginTop: '5px', color: '#ff6b6b' }}>
          <div>⚠️ Slow Queries:</div>
          {performanceData.slowQueries.map((sq, i) => (
            <div key={i} style={{ fontSize: '10px', marginLeft: '10px' }}>
              {sq.queryKey} ({Math.round(sq.duration / 1000)}s)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}