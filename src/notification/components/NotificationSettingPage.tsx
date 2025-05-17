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
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className='mb-4 flex h-16 items-center justify-between px-4'>
        <div className='flex items-center gap-2'>
          <Settings className='size-5' />
          <h1 className='text-2xl font-bold'>알림 설정</h1>
        </div>
        <Link to="/notifications" className="ml-auto">
          <X className='size-5' />
        </Link>
      </div>
      <Card className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="in-app-notification">인앱 알림</Label>
              <Switch
                id="in-app-notification"
                checked={inAppNotification}
                disabled={true}
              />
            </div>
            <PushNotificationSwitch userId={currentUser?.uid || ''} />
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notification">이메일 알림</Label>
              <Switch
                id="email-notification"
                checked={emailNotification}
                disabled={true}
              />
            </div>
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default NotificationSettingPage;