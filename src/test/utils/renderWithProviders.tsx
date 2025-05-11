import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/shared/hooks/useAuth';
import { HelmetProvider } from 'react-helmet-async';
import { NavigationProvider } from '@/shared/contexts/NavigationContext';
import { BottomTabHandlerProvider } from '@/shared/contexts/BottomTabHandlerContext';

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
      <HelmetProvider>
        <MemoryRouter initialEntries={[route]}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <NavigationProvider 
                debounceTime={500} 
                topThreshold={30} 
                ignoreSmallChanges={10}
              >
                <BottomTabHandlerProvider>
                  {ui}
                </BottomTabHandlerProvider>
              </NavigationProvider>
            </AuthProvider>
          </QueryClientProvider>
        </MemoryRouter>
      </HelmetProvider>
    );
  }