import { LogOut, Trash2, SquareArrowRight, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { auth } from '@/firebase';
import { SentryFeedbackDialog } from '@/shared/components/SentryFeedbackDialog';
import { useRemoteConfig } from '@/shared/contexts/RemoteConfigContext';
import { useClearCache } from '@/shared/hooks/useClearCache';
import { useTheme } from '@/shared/hooks/useTheme';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { Switch } from '@/shared/ui/switch';
import { signOut } from 'firebase/auth';

export default function UserSettingPage() {
  const navigate = useNavigate();
  const clearCache = useClearCache();
  const { theme, toggleTheme } = useTheme();
  const { value: blockUserFeatureEnabled } = useRemoteConfig('block_user_feature_enabled');

  // 로그아웃
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      toast.error('로그아웃에 실패했습니다. 다시 시도해주세요.', {position: 'bottom-center'});
    }
  };


  // 캐시 삭제
  const handleClearCache = async () => {
    const result = await clearCache({
      clearReactQuery: true,
      clearBrowserCache: true,
      clearLocalStorage: true,
    });
    if (result.success) {
      toast.success('캐시가 성공적으로 삭제되었습니다.', {position: 'bottom-center'});
    } else {
      toast.error('캐시 삭제에 실패했습니다. 다시 시도해주세요.', {position: 'bottom-center'});
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background py-3">
        <div className="container mx-auto flex items-center justify-between px-3 md:px-4">
          <div className="flex min-h-[44px] items-center space-x-2 rounded-lg p-2">
            <span className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">설정</span>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-3 py-2 md:px-4">
        <div className="reading-shadow space-y-0 overflow-hidden rounded-lg border border-border/50 bg-card">
          <div className="flex h-14 w-full items-center justify-between border-b border-border/30 px-4">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="size-5 text-muted-foreground" />
              ) : (
                <Sun className="size-5 text-muted-foreground" />
              )}
              <span className="text-base text-foreground">다크 모드</span>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              aria-label="다크 모드 토글"
            />
          </div>
          <Button
            variant="ghost"
            className="reading-hover reading-focus flex h-14 w-full items-center justify-start gap-3 rounded-none border-b border-border/30 px-4 text-base transition-all duration-200"
            onClick={handleSignOut}
          >
            <LogOut className="size-5 text-muted-foreground" /> 
            <span className="text-foreground">로그아웃</span>
          </Button>
          <SentryFeedbackDialog />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="reading-hover reading-focus flex h-14 w-full items-center justify-start gap-3 rounded-none border-b border-border/30 px-4 text-base transition-all duration-200"
              >
                <Trash2 className="size-5" /> 
                <span>캐시 삭제</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>캐시를 삭제하시겠습니까?</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearCache} className="bg-destructive hover:bg-destructive/90">
                  삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="ghost"
            className="reading-hover reading-focus flex h-14 w-full items-center justify-start gap-3 rounded-none border-b border-border/30 px-4 text-base transition-all duration-200"
            onClick={() => navigate('/join/form')}
          >
            <SquareArrowRight className="size-5 text-ring" /> 
            <span className="text-ring">다음 기수 신청하기</span>
          </Button>
          {blockUserFeatureEnabled && (
            <Button
              variant="ghost"
              className="reading-hover reading-focus flex h-14 w-full items-center justify-start gap-3 rounded-none px-4 text-base transition-all duration-200"
              onClick={() => navigate('/user/blocked-users')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-1.414 1.414M6.343 17.657l-1.415 1.415M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-foreground">접근 제어 관리</span>
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
