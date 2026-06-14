import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type React from 'react';
import { BottomTabHandlerProvider } from '@/shared/contexts/BottomTabHandlerContext';
import { NavigationProvider } from '@/shared/contexts/NavigationContext';
import { AuthProvider } from '@/shared/hooks/useAuth';
import { TEST_NAVIGATION_PROPS } from './testNavigationProps';

export interface WithProvidersOptions {
  queryClient?: QueryClient;
}

export interface WithProvidersResult {
  Wrapper: React.FC<{ children: React.ReactNode }>;
  queryClient: QueryClient;
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

/**
 * Returns a Wrapper that does not render its children itself, so the caller
 * owns the `render` call and can seed the returned `queryClient` via
 * `setQueryData(...)` before mounting the subject.
 *
 * Router-agnostic by design: tests that need routing must wrap the UI in
 * their own MemoryRouter / RouterProvider.
 */
export function withProviders(opts: WithProvidersOptions = {}): WithProvidersResult {
  const queryClient = opts.queryClient ?? createTestQueryClient();

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationProvider {...TEST_NAVIGATION_PROPS}>
          <BottomTabHandlerProvider>{children}</BottomTabHandlerProvider>
        </NavigationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );

  return { Wrapper, queryClient };
}
