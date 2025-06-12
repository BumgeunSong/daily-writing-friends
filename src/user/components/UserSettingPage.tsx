import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/firebase';
import { useToast } from '@/shared/hooks/use-toast';
import { useClearCache } from '@/shared/hooks/useClearCache';
import { useTheme } from '@/shared/hooks/useTheme';
import { LogOut, MessageCircle, Trash2, SquareArrowRight, Moon, Sun } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Switch } from '@/shared/ui/switch';
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
import { useRemoteConfig } from '@/shared/contexts/RemoteConfigContext';

export default function UserSettingPage() {
  const { toast } = useToast();
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
      toast({
        variant: 'destructive',
        description: '로그아웃에 실패했습니다. 다시 시도해주세요.',
      });
    }
  };

  // 피드백
  const handleFeedback = () => {
    window.open(
      'https://docs.google.com/forms/d/e/1FAIpQLSfujE9OSO58OZ6qFe9qw1vimWEcuPCX6jyDNCRZKOdCVWB5UQ/viewform?usp=sf_link',
      '_blank',
    );
  };

  // 캐시 삭제
  const handleClearCache = async () => {
    const result = await clearCache({
      clearReactQuery: true,
      clearBrowserCache: true,
      clearLocalStorage: true,
    });
    if (result.success) {
      toast({ description: '캐시가 성공적으로 삭제되었습니다.' });
    } else {
      toast({
        variant: 'destructive',
        description: '캐시 삭제에 실패했습니다. 다시 시도해주세요.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card py-3">
        <div className="container mx-auto flex items-center justify-between px-3 md:px-4">
          <div className="flex items-center space-x-2 rounded-lg p-2 min-h-[44px]">
            <span className="text-xl font-semibold tracking-tight md:text-2xl text-foreground">설정</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg p-2 min-h-[44px]">
            <Sun className="size-4 text-muted-foreground" />
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              aria-label="다크 모드 토글"
            />
            <Moon className="size-4 text-muted-foreground" />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-3 md:px-4 py-2">
        <div className="space-y-0 bg-card rounded-lg reading-shadow border border-border/50 overflow-hidden">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-start gap-3 rounded-none border-b border-border/30 text-base h-14 px-4 reading-hover reading-focus transition-all duration-200"
            onClick={handleSignOut}
          >
            <LogOut className="size-5 text-muted-foreground" /> 
            <span className="text-foreground">로그아웃</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-start gap-3 rounded-none border-b border-border/30 text-base h-14 px-4 reading-hover reading-focus transition-all duration-200"
            onClick={handleFeedback}
          >
            <MessageCircle className="size-5 text-muted-foreground" /> 
            <span className="text-foreground">피드백 보내기</span>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-start gap-3 rounded-none border-b border-border/30 text-base h-14 px-4 reading-hover reading-focus transition-all duration-200"
              >
                <Trash2 className="size-5 text-destructive" /> 
                <span className="text-destructive">캐시 삭제</span>
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
            className="w-full flex items-center justify-start gap-3 rounded-none border-b border-border/30 text-base h-14 px-4 reading-hover reading-focus transition-all duration-200"
            onClick={() => navigate('/join/form')}
          >
            <SquareArrowRight className="size-5 text-ring" /> 
            <span className="text-ring">다음 기수 신청하기</span>
          </Button>
          {blockUserFeatureEnabled && (
            <Button
              variant="ghost"
              className="w-full flex items-center justify-start gap-3 rounded-none text-base h-14 px-4 reading-hover reading-focus transition-all duration-200"
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
