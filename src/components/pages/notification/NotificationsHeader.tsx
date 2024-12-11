import React from 'react';
import { Bell, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotificationsHeader: React.FC = () => {
    return (
        <div className='h-16 mb-4 flex items-center justify-between px-4'>
            <div className='flex items-center gap-2'>
                <Bell className='w-6 h-6' />
                <h1 className='text-2xl font-bold'>알림</h1>
            </div>
            <Link to="/notifications/settings" className='flex items-center'>
                <Settings className='w-6 h-6 text-gray-600 hover:text-gray-900 transition-colors' />
            </Link>
        </div>
    );
};

export default NotificationsHeader;

