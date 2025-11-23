import * as Sentry from '@sentry/react';
import { QueryClient } from '@tanstack/react-query';

// 에러 처리를 전역적으로 적용하기 위한 QueryClient 커스텀
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: (error) => {
        console.error('An error occurred:', error);
        Sentry.captureException(error);
      },
    },
    mutations: {
      onError: (error) => {
        console.error('An error occurred during mutation:', error);
        Sentry.captureException(error);
      },
    },
  },
});

export default queryClient;