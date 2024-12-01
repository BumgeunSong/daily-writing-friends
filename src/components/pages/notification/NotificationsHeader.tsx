import React from 'react';
import { Bell } from 'lucide-react';
    
export const NotificationsHeader: React.FC = () => {
    return (
        <div className='mb-6 flex items-center justify-between px-4'>
            <div className='flex items-center gap-2'>
                <Bell className='size-5' />
                <h1 className='text-2xl font-bold'>알림</h1>
            </div>
        </div>
    );
};


export default NotificationsHeader;

