// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { BottomTabHandlerProvider } from './contexts/BottomTabHandlerContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { initSentry } from './centry';

initSentry();
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
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
  </React.StrictMode>,
);
