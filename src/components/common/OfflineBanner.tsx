import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const OfflineBanner = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }
  return (
    <div className='w-full bg-gray-100 dark:bg-gray-800 py-2 px-4 flex items-center justify-center sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700'>
      <WifiOff className='size-4 text-gray-500 dark:text-gray-400 mr-2' />
      <span className='text-sm font-medium text-gray-500 dark:text-gray-400'>오프라인 모드</span>
    </div>
  )
};

export default OfflineBanner; 