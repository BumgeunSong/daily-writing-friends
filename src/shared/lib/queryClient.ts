import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { trackQueryError, trackMutationError, trackQueryStart, trackQuerySuccess } from './queryErrorTracking';

// Create QueryCache with error handling
const queryCache = new QueryCache({
  onError: (error, query) => {
    trackQueryError(error, query);
  },
  onSuccess: (data, query) => {
    // Track successful queries for performance monitoring
    trackQuerySuccess(query.queryKey);
  },
});

// Create MutationCache with error handling
const mutationCache = new MutationCache({
  onError: (error, variables, context, mutation) => {
    trackMutationError(error, mutation);
  },
});

// Create and export a single QueryClient instance
// This can be imported and used in both React components (via useQueryClient)
// and non-React functions (router actions, utility functions, etc.)
export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      cacheTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: true,
      retry: 3,
      // Track query starts for performance monitoring
      onSuccess: (data) => {
        // Additional success handling if needed
      },
      onError: (error) => {
        // Local error handling can still be added in individual queries
        // Global handling happens in QueryCache
      },
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        // Local error handling can still be added in individual mutations
        // Global handling happens in MutationCache
      },
    },
  },
});