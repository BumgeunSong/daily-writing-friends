// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/shared/hooks/useAuth';
import App from './App';
import { initSentry } from '@/sentry';
import { RemoteConfigProvider } from '@/shared/contexts/RemoteConfigContext';
initSentry();
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RemoteConfigProvider>
            <App />
          </RemoteConfigProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
