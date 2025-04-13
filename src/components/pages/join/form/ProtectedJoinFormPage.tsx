import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '@/firebase';
import JoinFormPage from './JoinFormPage';
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
  const [showLoginDialog, setShowLoginDialog] = useState(!currentUser);

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

  return <JoinFormPage />;
} 