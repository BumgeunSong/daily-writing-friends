import './index.css';
import { useAuth } from '@/shared/hooks/useAuth';
import { useRemoteConfigReady } from '@/shared/contexts/RemoteConfigContext';
import { Loader2 } from 'lucide-react';
import { AppRouter } from './AppRouter';

export default function App() {
  const { currentUser } = useAuth();
  const remoteConfigReady = useRemoteConfigReady();

  if (!remoteConfigReady) {
    return <AppLoader />;
  }

  return <AppRouter currentUser={currentUser} />;
}

function AppLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Loader2 className="size-12 animate-spin text-primary" />
    </div>
  );
}