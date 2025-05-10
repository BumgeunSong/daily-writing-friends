import { UserCredential } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui//button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui//card';
import { User } from '@/user/model/User';
import { createUserData, fetchUserData } from '@/user/utils/userUtils';
import { useAuth } from '@/shared/hooks/useAuth';
import { signInWithGoogle } from '@/firebase';

export default function LoginPage() {
  const { loading, redirectPathAfterLogin, setRedirectPathAfterLogin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithGoogle();
      await ensureUserDataInFirestore(userCredential);

      // Redirect to the stored path or a default path after successful login
      const redirectTo = redirectPathAfterLogin || '/boards';
      setRedirectPathAfterLogin(null); // Clear the redirect path
      navigate(redirectTo, { replace: true });
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };
  const ensureUserDataInFirestore = async (userCredential: UserCredential) => {
    // Fetch user data from Firestore
    const userData = await fetchUserData(userCredential.user.uid);
    if (!userData) {
      // Create user data in Firestore
      const newUser: User = {
        uid: userCredential.user.uid,
        realName: userCredential.user.displayName,
        nickname: userCredential.user.displayName,
        email: userCredential.user.email,
        profilePhotoURL: userCredential.user.photoURL,
        bio: null,
        phoneNumber: null,
        referrer: null,
        boardPermissions: {
          'rW3Y3E2aEbpB0KqGiigd': 'read', // default board id
        },
      };
      await createUserData(newUser);
    }
  };

  if (loading) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center bg-background'>
        <Loader2 className='mb-4 size-12 animate-spin text-primary' />
        <p className='text-lg font-medium text-muted-foreground'>로그인 중...</p>
      </div>
    );
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-background'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <CardTitle className='text-3xl font-bold'>매일 글쓰기 프렌즈</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='mb-6 flex justify-center'>
            <img src='/pencil_icon.svg' alt='Logo' className='size-16' />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleLogin} className='w-full'>
            구글로 로그인하기
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
