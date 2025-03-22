import React from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  message: string;
  className?: string;
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({ message, className = '' }) => {
  return (
    <div className={`bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md flex items-center ${className}`}>
      <WifiOff className="size-4 text-amber-600 dark:text-amber-400 mr-2" />
      <p className="text-amber-600 dark:text-amber-400 text-sm">
        {message}
      </p>
    </div>
  );
};

export default OfflineBanner; 