// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { initSentry } from './centry';
import { AuthProvider } from '@shared/hooks/useAuth';
import { BottomTabHandlerProvider } from './contexts/BottomTabHandlerContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { HelmetProvider } from 'react-helmet-async';
initSentry();
const queryClient = new QueryClient();

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
              <App />
            </BottomTabHandlerProvider>
          </NavigationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
);
