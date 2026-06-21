import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';
import { cn } from '@/shared/utils';

type StackGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const stackGap: Record<StackGap, string> = {
  xs: 'space-y-1',
  sm: 'space-y-2',
  md: 'space-y-4',
  lg: 'space-y-6',
  xl: 'space-y-8',
};

interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: StackGap;
  asChild?: boolean;
}

/**
 * 세로 리듬을 표현하는 레이아웃 프리미티브. `asChild`로 의미 요소(<article>,
 * <header>, <section>)에 합성한다. 디자인 시스템의 spacing scale에 맞춰
 * gap 토큰(xs=4·sm=8·md=16·lg=24·xl=32px)만 노출한다.
 */
export function Stack({
  gap = 'md',
  asChild = false,
  className,
  ...props
}: StackProps) {
  const Comp = asChild ? Slot : 'div';
  return <Comp className={cn(stackGap[gap], className)} {...props} />;
}
