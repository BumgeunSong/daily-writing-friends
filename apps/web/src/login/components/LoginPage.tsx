import { Loader2 } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import { useGoogleLoginWithRedirect } from '@/login/hooks/useGoogleLoginWithRedirect';

export default function LoginPage() {
  const { loading } = useAuth();
  const { handleLogin, isLoading, error } = useGoogleLoginWithRedirect();

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
      <Card className='reading-shadow w-full max-w-md border-border/50'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-semibold tracking-tight text-foreground md:text-3xl'>매일 글쓰기 프렌즈</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='mb-6 flex justify-center'>
            <img src='/pencil_icon.svg' alt='Logo' className='size-16' />
          </div>
        </CardContent>
        <CardFooter className='flex-col gap-2'>
          <Button
            variant="default"
            onClick={() => handleLogin()}
            disabled={isLoading}
            className='min-h-[44px] w-full'
          >
            {isLoading ? (
              <>
                <Loader2 className='mr-2 size-4 animate-spin' />
                로그인 중...
              </>
            ) : (
              '구글로 로그인하기'
            )}
          </Button>
          {error && (
            <p className='text-sm text-destructive'>{error.message}</p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
