import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';

export type TabName = 'Home' | 'Stats' | 'Notifications' | 'Account';

export interface TabHandlers {
  Home?: () => void;
  Stats?: () => void;
  Notifications?: () => void;
  Account?: () => void;
}

interface BottomTabHandlerContextType {
  registerTabHandler: (tabName: TabName, handler: () => void) => void;
  unregisterTabHandler: (tabName: TabName) => void;
  handleTabAction: (tabName: TabName) => void;
}

const BottomTabHandlerContext = createContext<BottomTabHandlerContextType | undefined>(undefined);

export const BottomTabHandlerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [handlers, setHandlers] = useState<TabHandlers>({});

  const registerTabHandler = useCallback((tabName: TabName, handler: () => void) => {
    setHandlers(prev => ({ ...prev, [tabName]: handler }));
  }, []);

  const unregisterTabHandler = useCallback((tabName: TabName) => {
    setHandlers(prev => {
      const newHandlers = { ...prev };
      delete newHandlers[tabName];
      return newHandlers;
    });
  }, []);

  const handleTabAction = useCallback((tabName: TabName) => {
    const handler = handlers[tabName];
    if (handler) {
      handler();
    }
  }, [handlers]);

  return (
    <BottomTabHandlerContext.Provider value={{ registerTabHandler, unregisterTabHandler, handleTabAction }}>
      {children}
    </BottomTabHandlerContext.Provider>
  );
};

export const useBottomTabHandler = () => {
  const context = useContext(BottomTabHandlerContext);
  if (context === undefined) {
    throw new Error('useBottomTabHandler must be used within a BottomTabHandlerProvider');
  }
  return context;
};

// 편의를 위한 커스텀 훅 생성
export const useRegisterTabHandler = (tabName: TabName, handler: () => void) => {
  const { registerTabHandler, unregisterTabHandler } = useBottomTabHandler();

  React.useEffect(() => {
    registerTabHandler(tabName, handler);
    return () => unregisterTabHandler(tabName);
  }, [registerTabHandler, unregisterTabHandler, tabName, handler]);
};