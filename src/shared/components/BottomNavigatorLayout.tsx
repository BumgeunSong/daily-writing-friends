import { Outlet } from 'react-router-dom';
import BottomTabsNavigator from './BottomTabsNavigator';
import { Toaster } from '@/shared/ui//toaster';

export const BottomNavigatorLayout = () => (
    <div className='safe-top safe-right safe-bottom safe-left flex min-h-screen flex-col pb-16'>
        <div className='grow'>
            <Outlet />
        </div>
        <Toaster />
        <BottomTabsNavigator />
    </div>
);