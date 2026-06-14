import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type React from 'react';
import { BottomTabHandlerProvider } from '@/shared/contexts/BottomTabHandlerContext';
import { NavigationProvider } from '@/shared/contexts/NavigationContext';
import { AuthProvider } from '@/shared/hooks/useAuth';

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
 * Router-agnostic provider stack for integration tests.
 *
 * Returns a Wrapper component (intentionally not rendering anything itself —
 * the test owns the `render` call) and the QueryClient so the test can seed
 * the cache via `queryClient.setQueryData(...)` before mounting the subject.
 *
 * Tests that need a Router should wrap their UI in MemoryRouter / RouterProvider
 * themselves; route-config-driven scenarios will get a dedicated `renderAppAt`
 * helper in a follow-up PR (depends on extracting routes from router.tsx).
 */
export function withProviders(opts: WithProvidersOptions = {}): WithProvidersResult {
  const queryClient = opts.queryClient ?? createTestQueryClient();

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationProvider debounceTime={500} topThreshold={30} ignoreSmallChanges={10}>
          <BottomTabHandlerProvider>{children}</BottomTabHandlerProvider>
        </NavigationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );

  return { Wrapper, queryClient };
}
