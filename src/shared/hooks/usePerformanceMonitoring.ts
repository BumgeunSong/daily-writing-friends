import { trace } from 'firebase/performance';
import { useEffect } from 'react';
import { getFirebasePerformance } from '@/firebase';

export function usePerformanceMonitoring(pageName: string) {
  useEffect(() => {
    const perf = getFirebasePerformance();
    if (!perf) return;

    const pageLoadTrace = trace(perf, `${pageName}_page_load`);
    pageLoadTrace.start();

    return () => {
      pageLoadTrace.stop();
    };
  }, [pageName]);
}