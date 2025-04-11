import { Outlet } from 'react-router-dom';
import { Toaster } from '../ui/toaster';
import BottomTabsNavigator from './BottomTabsNavigator';

export const AfterLoginLayout = () => (
    <div className='flex min-h-screen flex-col pb-16 safe-top safe-right safe-bottom safe-left'>
        <div className='grow'>
            <Outlet />
        </div>
        <Toaster />
        <BottomTabsNavigator />
    </div>
);