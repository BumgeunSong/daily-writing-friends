import { Outlet } from 'react-router-dom';
import BottomTabsNavigator from './BottomTabsNavigator';

export const BottomNavigatorLayout = () => (
    <div className='flex min-h-screen flex-col pb-14 md:pb-16'>
        <div className='grow'>
            <Outlet />
        </div>
        <BottomTabsNavigator />
    </div>
);