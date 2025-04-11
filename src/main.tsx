// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { initSentry } from './centry';
import queryClient from './lib/QueryClient';
import { BottomTabHandlerProvider } from './contexts/BottomTabHandlerContext';
import { NavigationProvider } from './contexts/NavigationContext';

initSentry();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BottomTabHandlerProvider>
            <NavigationProvider debounceTime={500}>
              <App />
            </NavigationProvider>
          </BottomTabHandlerProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
