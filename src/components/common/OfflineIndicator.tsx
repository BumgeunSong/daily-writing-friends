import React from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="fixed bottom-4 right-4 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100 p-3 rounded-full shadow-md z-50 cursor-help">
            <WifiOff className="size-5" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>오프라인 모드</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default OfflineIndicator;