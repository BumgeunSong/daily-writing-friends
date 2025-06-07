// src/main.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/shared/hooks/useAuth';
import App from './App';
import { initSentry } from './centry';
import { BottomTabHandlerProvider } from './shared/contexts/BottomTabHandlerContext';
import { NavigationProvider } from './shared/contexts/NavigationContext';
import { RemoteConfigProvider } from '@/shared/contexts/RemoteConfigContext';
import { queryClient } from '@/shared/lib/queryClient';
initSentry();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
          <NavigationProvider 
            debounceTime={500} 
            topThreshold={30} 
            ignoreSmallChanges={10}
          >
            <BottomTabHandlerProvider>
              <RemoteConfigProvider>
                <App />
              </RemoteConfigProvider>
            </BottomTabHandlerProvider>
          </NavigationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
);
