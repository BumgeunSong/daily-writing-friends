import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { requestPermission } from '@/messaging/requestPermission';
import { useAuth } from '@/contexts/AuthContext';

const NotificationSettingPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [inAppNotification] = useState(true);
  const [emailNotification] = useState(true);
  const [pushNotification, setPushNotification] = useState(false);

  const handlePushNotificationToggle = () => {
    if (!pushNotification) {
        try {
            requestPermission(currentUser?.uid);
            setPushNotification((prev) => !prev);
        } catch (error) {
            console.error(error);
        }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className='h-16 mb-4 flex items-center justify-between px-4'>
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
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="in-app-notification">인앱 알림</Label>
              <Switch
                id="in-app-notification"
                checked={inAppNotification}
                disabled={true}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notification">푸시 알림</Label>
              <Switch
                id="push-notification"
                checked={pushNotification}
                disabled={false}
                onCheckedChange={handlePushNotificationToggle}
              />
            </div>
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