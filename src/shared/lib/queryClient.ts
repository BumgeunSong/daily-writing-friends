import { QueryClient } from '@tanstack/react-query';

// Create and export a single QueryClient instance
// This can be imported and used in both React components (via useQueryClient) 
// and non-React functions (router actions, utility functions, etc.)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      cacheTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: true,
      retry: 3,
    },
    mutations: {
      retry: 1,
    },
  },
});