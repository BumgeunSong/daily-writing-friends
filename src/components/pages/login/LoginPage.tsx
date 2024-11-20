import { UserCredential } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from '@/types/User';
import { createUserData, fetchUserData } from '@/utils/userUtils';
import { useAuth } from '../../../contexts/AuthContext';
import { signInWithGoogle } from '../../../firebase';

export default function LoginPage() {
  const { loading } = useAuth();

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithGoogle();
      await ensureUserDataInFirestore(userCredential);
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
        boardPermissions: {
          '5pxedM1zGP4GbH7sx1X2': 'write', // default board id
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
