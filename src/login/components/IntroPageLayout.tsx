import type { ReactNode } from 'react';

interface IntroPageLayoutProps {
  children: ReactNode;
  footer?: ReactNode;
}

export function IntroPageLayout({ children, footer }: IntroPageLayoutProps) {
  return (
    <div className='flex min-h-screen justify-center bg-background'>
      <div className='relative flex w-full max-w-3xl flex-col pb-24 lg:max-w-4xl'>
        <div className='flex-1 overflow-auto'>
          {children}
        </div>
        
        {footer && (
          <>
            <div className='h-12' />
            {footer}
          </>
        )}
      </div>
    </div>
  );
}