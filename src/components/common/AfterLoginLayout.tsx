import { Outlet } from 'react-router-dom';
import { Toaster } from '../ui/toaster';
import BottomTabsNavigator from '../pages/BottomTabsNavigator';
import OfflineBanner from './OfflineBanner';

export const AfterLoginLayout = () => {
  
  return (
    <div className='flex min-h-screen flex-col pb-16 safe-top safe-right safe-bottom safe-left'>
      <OfflineBanner />
      <div className='grow'>
        <Outlet />
      </div>
      <Toaster />
      <BottomTabsNavigator />
    </div>
  );
};