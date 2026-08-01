import type { ReactNode } from 'react';
import { ReadingColumn } from '@/shared/ui/reading-column';
import { Row } from '@/shared/ui/row';
import { Stack } from '@/shared/ui/stack';

interface PostDetailLayoutProps {
  children: ReactNode;
}

function PostDetailLayoutRoot({ children }: PostDetailLayoutProps) {
  return (
    <div className='min-h-screen bg-background'>
      <ReadingColumn>{children}</ReadingColumn>
    </div>
  );
}

function Article({ children }: { children: ReactNode }) {
  return (
    <Stack asChild gap='md'>
      <article>{children}</article>
    </Stack>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return (
    <Row
      align='center'
      justify='between'
      className='mt-6 border-t border-border py-4'
    >
      {children}
    </Row>
  );
}

function Comments({ children }: { children: ReactNode }) {
  return <div className='mt-8'>{children}</div>;
}

/**
 * 글 상세 페이지의 슬롯 기반 레이아웃. BackButton·Article·Actions·Comments가
 * 동일한 ReadingColumn에 정렬되도록 합성되며, 새 영역을 추가할 때 max-width·
 * padding을 다시 적지 않아도 된다.
 */
export const PostDetailLayout = Object.assign(PostDetailLayoutRoot, {
  Article,
  Actions,
  Comments,
});
