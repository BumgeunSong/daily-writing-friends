import { useEffect } from 'react';
import { trace } from 'firebase/performance';
import { performance } from '@/firebase';

export function usePerformanceMonitoring(pageName: string) {
  useEffect(() => {
    if (!performance) return;

    const pageLoadTrace = trace(performance, `${pageName}_page_load`);
    pageLoadTrace.start();

    return () => {
      pageLoadTrace.stop();
    };
  }, [pageName]);
}