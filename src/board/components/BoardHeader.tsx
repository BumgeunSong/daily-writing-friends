import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { fetchBoardTitle } from '@/board/utils/boardUtils';
import StatusMessage from '@/shared/components/StatusMessage';

interface BoardHeaderProps {
  boardId?: string;
}

const BoardHeader: React.FC<BoardHeaderProps> = ({ boardId }) => {
  const { data: title, isLoading, error } = useQuery(
    ['boardTitle', boardId],
    () => fetchBoardTitle(boardId || ''),
    {
      enabled: !!boardId, // boardId가 있을 때만 쿼리 실행
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
      </div>
    </header>
  );
};

export default BoardHeader;
