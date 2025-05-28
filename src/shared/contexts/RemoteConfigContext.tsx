import React, { createContext, useContext, useEffect, useState } from 'react';
import { remoteConfig } from '@/firebase';
import { fetchAndActivate } from 'firebase/remote-config';

const RemoteConfigContext = createContext<{ ready: boolean }>({ ready: false });

export function RemoteConfigProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetchAndActivate(remoteConfig)
      .catch((err) => {
        console.error('Remote Config fetchAndActivate 실패:', err);
      })
      .finally(() => setReady(true));
  }, []);

  return (
    <RemoteConfigContext.Provider value={{ ready }}>
      {children}
    </RemoteConfigContext.Provider>
  );
}

export function useRemoteConfigReady() {
  return useContext(RemoteConfigContext).ready;
} 