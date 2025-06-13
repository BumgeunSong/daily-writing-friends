import { Bell, Settings } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

export const NotificationsHeader: React.FC = () => {
    return (
        <header className="bg-background py-3">
            <div className="container mx-auto flex items-center justify-between px-3 md:px-4">
                <div className="flex items-center space-x-2 rounded-lg p-2 min-h-[44px]">
                    <Bell className="size-4 md:size-5 text-foreground" />
                    <span className="text-xl font-semibold tracking-tight md:text-2xl text-foreground">알림</span>
                </div>
                <Link 
                    to="/notifications/settings" 
                    className="flex items-center space-x-2 rounded-lg p-2 min-h-[44px] reading-hover reading-focus text-foreground transition-all duration-200 active:scale-[0.99]"
                >
                    <Settings className="size-4 md:size-5" />
                </Link>
            </div>
        </header>
    );
};

export default NotificationsHeader;

