import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/firebase';
import { useToast } from '@/shared/hooks/use-toast';
import { useClearCache } from '@/shared/hooks/useClearCache';
import { LogOut, MessageCircle, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
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

export default function UserSettingPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const clearCache = useClearCache();

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
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-start">
      <header className="w-full bg-black py-4 text-white">
        <div className="px-4">
          <h2 className="text-xl font-bold text-left">설정</h2>
        </div>
      </header>
      <div className="w-full flex flex-col gap-0">
        <Button
          variant="ghost"
          className="w-full flex items-center justify-start gap-2 rounded-none border-b border-border text-base h-14"
          onClick={handleSignOut}
        >
          <LogOut className="size-5" /> 로그아웃
        </Button>
        <Button
          variant="ghost"
          className="w-full flex items-center justify-start gap-2 rounded-none border-b border-border text-base h-14"
          onClick={handleFeedback}
        >
          <MessageCircle className="size-5" /> 피드백 보내기
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center justify-start gap-2 rounded-none text-red-500 border-b border-border text-base h-14"
            >
              <Trash2 className="size-5" /> 캐시 삭제
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>캐시를 삭제하시겠습니까?</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearCache} className="bg-red-500 hover:bg-red-600">
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
