import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '@/firebase';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import { createUserIfNotExists } from '@/user/api/user';

export default function LoginPage() {
  const { loading, redirectPathAfterLogin, setRedirectPathAfterLogin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithGoogle();
      await createUserIfNotExists(userCredential.user);

      // Use redirect path from useAuth context (set by RouterAuthGuard)
      const redirectTo = redirectPathAfterLogin || '/boards';
      setRedirectPathAfterLogin(null); // Clear the redirect path
      navigate(redirectTo, { replace: true });
    } catch (error) {
      console.error('Error signing in with Google:', error);
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
    <div className='flex min-h-screen items-center justify-center bg-background px-3 md:px-4'>
      <Card className='w-full max-w-md reading-shadow border-border/50'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl md:text-3xl font-semibold text-foreground tracking-tight'>매일 글쓰기 프렌즈</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='mb-6 flex justify-center'>
            <img src='/pencil_icon.svg' alt='Logo' className='size-16' />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="default"
            onClick={handleLogin} 
            className='w-full min-h-[44px]'
          >
            구글로 로그인하기
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
