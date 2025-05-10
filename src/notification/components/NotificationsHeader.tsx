import { Bell, Settings } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

export const NotificationsHeader: React.FC = () => {
    return (
        <div className='mb-4 flex h-16 items-center justify-between px-4'>
            <div className='flex items-center gap-2'>
                <Bell className='size-6' />
                <h1 className='text-2xl font-bold'>알림</h1>
            </div>
            <Link to="/notifications/settings" className='flex items-center'>
                <Settings className='size-6 text-gray-600 transition-colors hover:text-gray-900' />
            </Link>
        </div>
    );
};

export default NotificationsHeader;

