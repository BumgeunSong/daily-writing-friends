import { ReactNode } from 'react';

interface IntroContentSectionProps {
  children: ReactNode;
  className?: string;
}

export function IntroContentSection({ children, className = '' }: IntroContentSectionProps) {
  return (
    <div className={`space-y-8 px-2 md:px-6 ${className}`.trim()}>
      {children}
    </div>
  );
}

interface SectionWrapperProps {
  children: ReactNode;
  variant?: 'default' | 'highlighted' | 'grid';
}

export function SectionWrapper({ children, variant = 'default' }: SectionWrapperProps) {
  const variantClasses = {
    default: '',
    highlighted: 'px-0 md:px-4',
    grid: 'px-4 md:px-4',
  };

  const className = variantClasses[variant];

  if (variant === 'highlighted') {
    return (
      <div className={className}>
        <div className='rounded-lg bg-muted/10 p-6'>
          {children}
        </div>
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className={className}>
        <div className='space-y-8 md:grid md:grid-cols-2 md:gap-8 md:space-y-0'>
          {children}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}