import { Settings, X } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { Card } from '@/shared/ui/card';
import { Label } from '@/shared/ui/label';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Switch } from '@/shared/ui/switch';
import PushNotificationSwitch from './PushNotificationSwitch';

const NotificationSettingPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [inAppNotification] = React.useState(false);
  const [emailNotification] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background py-3">
        <div className="container mx-auto flex items-center justify-between px-3 md:px-4">
          <div className="flex items-center space-x-2 rounded-lg p-2 min-h-[44px]">
            <Settings className="size-4 md:size-5 text-foreground" />
            <span className="text-xl font-semibold tracking-tight md:text-2xl text-foreground">알림 설정</span>
          </div>
          <Link 
            to="/notifications" 
            className="flex items-center space-x-2 rounded-lg p-2 min-h-[44px] reading-hover reading-focus text-foreground transition-all duration-200 active:scale-[0.99]"
          >
            <X className="size-4 md:size-5" />
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-3 md:px-4 py-2">
        <div className="bg-card reading-shadow border border-border/50 rounded-lg overflow-hidden">
          <div className="space-y-0 p-4">
            <div className="flex items-center justify-between py-3 border-b border-border/30">
              <Label htmlFor="in-app-notification" className="text-foreground">인앱 알림</Label>
              <Switch
                id="in-app-notification"
                checked={inAppNotification}
                disabled={true}
              />
            </div>
            <div className="py-3 border-b border-border/30">
              <PushNotificationSwitch userId={currentUser?.uid || ''} />
            </div>
            <div className="flex items-center justify-between py-3">
              <Label htmlFor="email-notification" className="text-foreground">이메일 알림</Label>
              <Switch
                id="email-notification"
                checked={emailNotification}
                disabled={true}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotificationSettingPage;