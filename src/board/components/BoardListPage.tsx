// src/board/components/BoardListPage.tsx
import React from 'react';
import { Link, useLoaderData } from 'react-router-dom';
import { Board } from '@/board/model/Board';

// This is what the loader returns - type it properly
interface BoardListData {
  boards: Board[];
}

const BoardListPage: React.FC = () => {
  // No more useQuery, no more loading/error states!
  const { boards } = useLoaderData() as BoardListData;

  const handleBoardClick = (boardId: string) => {
    localStorage.setItem('boardId', boardId);
  };

  // Notice: No loading or error handling - the router handles it!
  // The component only focuses on rendering the UI
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