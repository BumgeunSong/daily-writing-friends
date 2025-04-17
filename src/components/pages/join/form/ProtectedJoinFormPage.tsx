import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '@/firebase';
import { useIsCurrentUserActive } from '@/hooks/useIsCurrentUserActive';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ProtectedJoinFormPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { isCurrentUserActive } = useIsCurrentUserActive();
  const [showLoginDialog, setShowLoginDialog] = useState(!currentUser);
  const [isLoading, setIsLoading] = useState(true);

  // 로그인 상태와 사용자 유형에 따라 적절한 페이지로 리다이렉트
  useEffect(() => {
    if (currentUser) {
      // 사용자 정보가 로드되었는지 확인
      if (isCurrentUserActive !== undefined) {
        setIsLoading(false);
        // 기존 사용자는 active-user 페이지로, 신규 사용자는 new-user 페이지로 리다이렉트
        navigate(isCurrentUserActive ? '/join/form/active-user' : '/join/form/new-user', { replace: true });
      }
    }
  }, [currentUser, isCurrentUserActive, navigate]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      setShowLoginDialog(false);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleCancel = () => {
    setShowLoginDialog(false);
    navigate('/join');
  };

  if (!currentUser) {
    return (
      <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>로그인이 필요해요</AlertDialogTitle>
            <AlertDialogDescription>
              다음 기수 신청을 하려면 로그인이 필요해요
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogin}>Google 로그인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // 로딩 중인 경우 로딩 표시
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 이 부분은 useEffect에서 리다이렉트되므로 실행되지 않지만, 혹시 모를 상황을 위해 둠
  return null;
} 