import React from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface NotificationsHeaderProps {
    unreadCount: number;
    onMarkAllAsReadClick: () => void;
}

interface NotificationsHeaderProps {
    unreadCount: number;
    onMarkAllAsReadClick: () => void;
}

export const NotificationsHeader: React.FC<NotificationsHeaderProps> = ({
    unreadCount,
    onMarkAllAsReadClick,
}) => {
    return (
        <div className='mb-6 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
                <Bell className='size-5' />
                <h1 className='text-2xl font-bold'>알림</h1>
                <Badge variant='secondary' className='ml-2'>
                    {unreadCount}
                </Badge>
            </div>
            <Button variant='outline' size='sm' onClick={onMarkAllAsReadClick}>
                모두 읽음 표시
            </Button>
        </div>
    );
};


export default NotificationsHeader;
