import { useState } from 'react';
import { X } from 'lucide-react';
import { useUserPostSearch } from '@/user/hooks/useUserPostSearch';
import { PostItem, PostItemSkeleton } from '@/user/components/UserPostItem';
import { UserPostSearchInput } from '@/user/components/UserPostSearchInput';
import { deriveSearchState } from '@/user/components/deriveSearchState';

const RESULTS_CAP = 50;
const LOADING_SKELETONS = 5;

interface UserPostSearchViewProps {
  userId: string;
  onExitSearch: () => void;
}

export function UserPostSearchView({ userId, onExitSearch }: UserPostSearchViewProps) {
  const [debouncedValue, setDebouncedValue] = useState('');
  const trimmedQuery = debouncedValue.trim();
  const result = useUserPostSearch(userId, trimmedQuery);

  const state = deriveSearchState(trimmedQuery, {
    isFetching: result.isFetching,
    isError: result.isError,
    data: result.data,
  });

  return (
    <>
      <header className="sticky top-0 z-10 bg-background py-3">
        <div className="container mx-auto flex items-center gap-2 px-3 md:px-4">
          <button
            type="button"
            onClick={onExitSearch}
            aria-label="검색 닫기"
            className="reading-hover reading-focus flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-foreground transition-[transform,background-color] duration-200 active:scale-[0.99]"
          >
            <X className="size-5" />
          </button>
          <div className="flex-1">
            <UserPostSearchInput
              onDebouncedChange={setDebouncedValue}
              onEscape={onExitSearch}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 py-2 pb-16 md:px-4">
        {state === 'idle' && (
          <div className="py-10 text-center">
            <p className="text-base text-foreground">내가 쓴 글에서 제목 또는 내용으로 검색하세요</p>
            <p className="mt-2 text-sm text-muted-foreground">제목과 본문에서 일치하는 글을 찾습니다.</p>
          </div>
        )}

        {state === 'loading' && (
          <div className="space-y-2">
            {Array.from({ length: LOADING_SKELETONS }).map((_, i) => (
              <PostItemSkeleton key={i} />
            ))}
          </div>
        )}

        {state === 'empty' && (
          <div className="py-10 text-center">
            <p className="text-muted-foreground">{`'${trimmedQuery}'에 일치하는 글이 없습니다.`}</p>
          </div>
        )}

        {state === 'error' && (
          <div className="py-10 text-center">
            <p className="text-muted-foreground">검색 중 문제가 발생했습니다. 다시 시도해주세요.</p>
          </div>
        )}

        {state === 'results' && result.data && (
          <div className="space-y-2">
            {result.data.slice(0, RESULTS_CAP).map((post) => (
              <PostItem key={post.id} post={post} />
            ))}
            {result.data.length > RESULTS_CAP && (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground">최근 50개까지만 표시됩니다. 검색어를 더 구체적으로 입력해보세요.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
