import { LoaderIcon } from 'lucide-react';
import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { usePushPermission } from '@/hooks/usePushPermission';
import { usePushSupport } from '@/hooks/usePushSupport';

interface PushNotificationSwitchProps {
    userId: string;
}

const PushNotificationSwitch: React.FC<PushNotificationSwitchProps> = ({ userId }) => {
    const { hasPushPermission, togglePushNotification, isLoading: isPermissionLoading } = usePushPermission(userId);
    const { isIOSSafari, isAndroid, isPWA, isPushSupported, isLoading: isSupportLoading } = usePushSupport();

    const isLoading = isPermissionLoading || isSupportLoading;

    return (
        <div className="flex items-center justify-between">
            <div>
                <Label htmlFor="push-notification">푸시 알림</Label>
                {isIOSSafari && !isPWA && (
                    <p className="text-sm text-muted-foreground">
                        푸시 알림을 끄거나 켜려면 이 웹사이트를 홈 화면에 추가해주세요.
                    </p>
                )}
                {isAndroid && !isPWA && (
                    <p className="text-sm text-muted-foreground">
                        A푸시 알림을 끄거나 켜려면 이 웹사이트를 홈 화면에 추가해주세요.
                    </p>
                )}
                {!isPushSupported && (
                    <p className="text-sm text-muted-foreground">
                        푸시 알림을 지원하지 않는 환경입니다. 최신 브라우저를 사용하고 있는지 확인하세요.
                    </p>
                )}
            </div>
            {isLoading ? (
                <div className="loader">
                    <LoaderIcon className="size-5" />
                </div>
            ) : (
                <Switch
                    id="push-notification"
                    checked={hasPushPermission}
                    disabled={!isPushSupported}
                    onCheckedChange={togglePushNotification}
                />
            )}
        </div>
    );
};

export default PushNotificationSwitch;
