// src/components/Pages/BoardListPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Board } from '../../../types/Board';
import { fetchBoardsWithUserPermissions } from '../../../utils/boardUtils';
import { useQuery } from '@tanstack/react-query';
import StatusMessage from '../../common/StatusMessage';

const BoardListPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { data: boards = [], isLoading, error } = useQuery<Board[]>(
    ['boards', currentUser?.uid],
    () => fetchBoardsWithUserPermissions(currentUser!.uid),
    {
      enabled: !!currentUser, // currentUser가 있을 때만 쿼리 실행
      staleTime: 1000 * 60 * 5, // 5분 동안 데이터가 신선하다고 간주
      cacheTime: 1000 * 60 * 30, // 10분 동안 캐시 유지
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
    <div className='mx-auto max-w-3xl px-4 py-8'>
      <h1 className='mb-4 text-2xl font-bold'>어디로 들어갈까요?</h1>
      {boards.length === 0 ? (
        <div className='text-center text-gray-600'>
          <p>아직 초대받은 게시판이 없어요. 관리자에게 문의해주세요. 😔</p>
        </div>
      ) : (
        <ul className='space-y-4'>
          {boards.map((board) => (
            <Link
              to={`/board/${board.id}`}
              onClick={() => handleBoardClick(board.id)}
              key={board.id}
            >
              <li className='rounded bg-white p-4 shadow transition hover:bg-gray-100'>
                <h2 className='text-xl font-semibold'>{board.title}</h2>
                <p className='text-gray-600'>{board.description}</p>
              </li>
            </Link>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BoardListPage;
