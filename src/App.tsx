import './index.css';
import { useRemoteConfigReady, RemoteConfigProvider } from '@/shared/contexts/RemoteConfigContext';
import { Loader2 } from 'lucide-react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { NavigationProvider } from '@/shared/contexts/NavigationContext';
import { BottomTabHandlerProvider } from '@/shared/contexts/BottomTabHandlerContext';

export default function App() {
  return (
    <RemoteConfigProvider>
      <AppWithProviders />
    </RemoteConfigProvider>
  );
}

function AppWithProviders() {
  const remoteConfigReady = useRemoteConfigReady();
  if (!remoteConfigReady) {
    return <AppLoader />;
  }
  return (
    <NavigationProvider debounceTime={500} topThreshold={30} ignoreSmallChanges={10}>
      <BottomTabHandlerProvider>
        <RouterProvider router={router} />
      </BottomTabHandlerProvider>
    </NavigationProvider>
  );
}

function AppLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Loader2 className="size-12 animate-spin text-primary" />
    </div>
  );
}