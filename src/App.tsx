import './index.css';
import { useAuth } from '@/shared/hooks/useAuth';
import { useRemoteConfigReady } from '@/shared/contexts/RemoteConfigContext';
import { Loader2 } from 'lucide-react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

export default function App() {
  const { loading } = useAuth();
  const remoteConfigReady = useRemoteConfigReady();

  if (!remoteConfigReady || loading) {
    return <AppLoader />;
  }

  return (
    <RouterProvider 
      router={router}
      fallbackElement={<AppLoader />}
    />
  );
}

function AppLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Loader2 className="size-12 animate-spin text-primary" />
    </div>
  );
}