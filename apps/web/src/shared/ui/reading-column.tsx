import * as React from 'react';
import { cn } from '@/shared/utils';

type ReadingColumnTag = 'main' | 'div' | 'section' | 'article';

interface ReadingColumnProps extends React.HTMLAttributes<HTMLElement> {
  as?: ReadingColumnTag;
}

/**
 * 본문 가독성을 위한 페이지 폭 컨테이너. 본문·헤더·푸터 액션·댓글이 동일한
 * 컬럼에 정렬되도록 단일 지점에서 max-width·padding·overflow-x를 소유한다.
 */
export function ReadingColumn({
  as: Tag = 'main',
  className,
  ...props
}: ReadingColumnProps) {
  return (
    <Tag
      className={cn(
        'container mx-auto max-w-2xl overflow-x-hidden px-6 py-2',
        className,
      )}
      {...props}
    />
  );
}
