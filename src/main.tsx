// src/main.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/shared/hooks/useAuth';
import { RemoteConfigProvider } from '@/shared/contexts/RemoteConfigContext';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { queryClient } from '@/shared/lib/queryClient';
import { initSentry } from './sentry';
initSentry();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RemoteConfigProvider>
              <RouterProvider router={router} />
            </RemoteConfigProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
