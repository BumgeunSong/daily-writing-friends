import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { BottomTabHandlerProvider } from '@/shared/contexts/BottomTabHandlerContext';
import { NavigationProvider } from '@/shared/contexts/NavigationContext';
import { AuthProvider } from '@/shared/hooks/useAuth';
import { TEST_NAVIGATION_PROPS } from './testNavigationProps';

export function renderWithProviders(
    ui: React.ReactElement,
    { route = '/' }: { route?: string } = {}
  ) {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // 테스트에서 자동 재시도 방지
        },
      },
    });
    window.history.pushState({}, 'Test page', route);
    return render(
      <MemoryRouter initialEntries={[route]}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NavigationProvider {...TEST_NAVIGATION_PROPS}>
              <BottomTabHandlerProvider>
                {ui}
              </BottomTabHandlerProvider>
            </NavigationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  }