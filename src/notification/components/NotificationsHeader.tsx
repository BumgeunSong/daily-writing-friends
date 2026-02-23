import { Bell } from 'lucide-react';
import type React from 'react';

export const NotificationsHeader: React.FC = () => {
    return (
        <header className="bg-background py-3">
            <div className="container mx-auto px-3 md:px-4">
                <div className="flex min-h-[44px] items-center space-x-2 rounded-lg p-2">
                    <Bell className="size-4 text-foreground md:size-5" />
                    <span className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">알림</span>
                </div>
            </div>
        </header>
    );
};

export default NotificationsHeader;

