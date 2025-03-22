import { ChevronDown, WifiOff } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBoardTitle } from '../../../utils/boardUtils';
import StatusMessage from '../../common/StatusMessage';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BoardHeaderProps {
  boardId?: string;
}

const BoardHeader: React.FC<BoardHeaderProps> = React.memo(({ boardId }) => {
  const isOnline = useOnlineStatus();
  const { data: title, isLoading, error } = useQuery(
    ['boardTitle', boardId],
    () => fetchBoardTitle(boardId || ''),
    {
      enabled: !!boardId, // boardId가 있을 때만 쿼리 실행
      staleTime: 5 * 60 * 1000, // 5분
      cacheTime: 24 * 60 * 60 * 1000, // 24시간
    }
  );

  if (isLoading) {
    return <StatusMessage isLoading loadingMessage="타이틀을 불러오는 중..." />;
  }

  if (error) {
    return <StatusMessage error errorMessage="타이틀을 불러오는 중에 문제가 생겼어요." />;
  }

  return (
    <header className='bg-primary py-4 text-primary-foreground'>
      <div className='container mx-auto flex items-center justify-between px-4'>
        <Link
          to='/boards/list'
          className='flex items-center space-x-2 rounded p-2 transition hover:bg-primary-foreground/10'
        >
          <span className='text-2xl font-bold sm:text-3xl'>{title || '타이틀 없음'}</span>
          <ChevronDown className='size-5' />
        </Link>
        
        {/* 오프라인 상태 인디케이터 */}
        {!isOnline && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center bg-primary-foreground/10 px-3 py-1.5 rounded-full">
                  <WifiOff className="size-4 mr-2" />
                  <span className="text-sm font-medium">오프라인</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>오프라인 모드: 캐시된 데이터만 표시됩니다</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </header>
  );
});

export default BoardHeader;
