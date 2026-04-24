// src/components/Pages/BoardListPage.tsx
import { useQuery } from '@tanstack/react-query';
import type React from 'react';
import { Link } from 'react-router-dom';
import type { Board } from '@/board/model/Board';
import { fetchBoardsWithUserPermissions } from '@/board/utils/boardUtils';
import StatusMessage from '@/shared/components/StatusMessage';
import { useRemoteConfig } from '@/shared/contexts/RemoteConfigContext';
import { useAuth } from '@/shared/hooks/useAuth';
import { Badge } from '@/shared/ui/badge';

const BoardListPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { value: activeBoardId } = useRemoteConfig("active_board_id");
  
  const { data: boards = [], isLoading, error } = useQuery<Board[]>(
    ['boards', currentUser?.uid],
    () => fetchBoardsWithUserPermissions(currentUser!.uid),
    {
      enabled: !!currentUser, // currentUser가 있을 때만 쿼리 실행
      staleTime: 1000 * 60 * 5, // 5분 동안 데이터가 신선하다고 간주
      cacheTime: 1000 * 60 * 30, // 10분 동안 캐시 유지
      select: (data) => {

        return [...data].sort((a, b) => {
          // 1. 활성화된 게시판을 맨 위로
          if (a.id === activeBoardId && b.id !== activeBoardId) return -1;
          if (b.id === activeBoardId && a.id !== activeBoardId) return 1;
          
          // 2. cohort 최근 순으로 정렬, cohort가 없는 경우 맨 뒤로
          if (!a.cohort) return 1;
          if (!b.cohort) return -1;
          return b.cohort - a.cohort;
        });
      },
    }
  );

  const handleBoardClick = (boardId: string) => {
    localStorage.setItem('boardId', boardId);
  };

  if (isLoading) {
    return <StatusMessage isLoading loadingMessage="게시판을 불러오는 중..." />;
  }

  if (error) {
    return <StatusMessage error errorMessage="게시판을 불러오는 중에 문제가 생겼어요. 잠시 후 다시 시도해주세요." />;
  }

  return (
    <div className='min-h-screen bg-background'>
      <header className="bg-background py-3">
        <div className="container mx-auto flex items-center justify-between px-3 md:px-4">
          <div className="flex min-h-[44px] items-center space-x-2 rounded-lg p-2">
            <span className='text-xl font-semibold tracking-tight text-foreground md:text-2xl'>어디로 들어갈까요?</span>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-3 py-2 md:px-4">
        {boards.length === 0 ? (
          <div className='py-8 text-center'>
            <p className="text-reading text-muted-foreground">아직 초대받은 게시판이 없어요. 관리자에게 문의해주세요. 😔</p>
          </div>
        ) : (
          <div className='space-y-2'>
            {boards.map((board) => {
              const isActiveBoard = board.id === activeBoardId;
              return (
                <Link
                  to={`/board/${board.id}`}
                  onClick={() => handleBoardClick(board.id)}
                  key={board.id}
                  className="reading-focus block"
                >
                  <div className={`reading-shadow reading-hover rounded-lg border bg-card p-4 transition-[transform,background-color] duration-200 active:scale-[0.99] ${
                    isActiveBoard 
                      ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' 
                      : 'border-border/50'
                  }`}>
                    <div className="mb-1 flex items-center justify-between">
                      <h2 className='text-lg font-semibold text-foreground'>{board.title}</h2>
                      {isActiveBoard && (
                        <Badge 
                          variant="default" 
                          className="pointer-events-none border-primary/20 bg-primary/10 text-primary"
                        >
                          진행 중인 게시판
                        </Badge>
                      )}
                    </div>
                    <p className='text-reading text-sm text-muted-foreground'>{board.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default BoardListPage;
