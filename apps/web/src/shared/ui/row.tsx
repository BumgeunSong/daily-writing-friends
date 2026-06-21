import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';
import { cn } from '@/shared/utils';

type RowGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type RowAlign = 'start' | 'center' | 'end' | 'baseline';
type RowJustify = 'start' | 'center' | 'end' | 'between' | 'around';

const rowGap: Record<RowGap, string> = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

const rowAlign: Record<RowAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
};

const rowJustify: Record<RowJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
};

interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: RowGap;
  align?: RowAlign;
  justify?: RowJustify;
  asChild?: boolean;
}

/**
 * 가로 정렬·간격을 표현하는 레이아웃 프리미티브. flex container의
 * align/justify/gap을 토큰으로 강제해 임의값 사용을 방지한다.
 */
export function Row({
  gap = 'md',
  align = 'center',
  justify = 'start',
  asChild = false,
  className,
  ...props
}: RowProps) {
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      className={cn(
        'flex',
        rowAlign[align],
        rowJustify[justify],
        rowGap[gap],
        className,
      )}
      {...props}
    />
  );
}
