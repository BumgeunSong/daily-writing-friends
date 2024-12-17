import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePushSupport } from '@/hooks/usePushSupport';
import { usePushPermission } from '@/hooks/usePushPermission';

const NotificationSettingPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [inAppNotification] = useState(true);
  const [emailNotification] = useState(true);
  const { hasPushPermission, togglePushNotification } = usePushPermission(currentUser?.uid || '');
  const { isIOSSafari, isAndroid, isPWA, isPushSupported } = usePushSupport();

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
              <div>
                <Label htmlFor="push-notification">푸시 알림</Label>
                {isIOSSafari && !isPWA && (
                  <p className="text-sm text-muted-foreground">
                    iOS에서 푸시 알림을 받으려면 이 웹사이트를 홈 화면에 추가해주세요.
                  </p>
                )}
                {isAndroid && !isPWA && (
                  <p className="text-sm text-muted-foreground">
                    Android에서 푸시 알림을 받으려면 이 웹사이트를 홈 화면에 추가해주세요.
                  </p>
                )}
              </div>
              <Switch
                id="push-notification"
                checked={hasPushPermission}
                disabled={isPushSupported}
                onCheckedChange={togglePushNotification}
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