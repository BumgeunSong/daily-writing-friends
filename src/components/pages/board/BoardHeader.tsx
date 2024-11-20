import { ChevronDown } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchBoardTitle } from '../../../utils/boardUtils';

interface BoardHeaderProps {
  boardId?: string;
}

const BoardHeader: React.FC<BoardHeaderProps> = ({ boardId }) => {
  const [title, setTitle] = useState<string>('Loading...');

  useEffect(() => {
    const loadBoardTitle = async () => {
      const title = await fetchBoardTitle(boardId || '');
      setTitle(title);
    };

    loadBoardTitle();
  }, [boardId]);

  return (
    <header className='bg-primary py-4 text-primary-foreground'>
      <div className='container mx-auto flex items-center justify-between px-4'>
        <Link
          to='/boards/list'
          className='flex items-center space-x-2 rounded p-2 transition hover:bg-primary-foreground/10'
        >
          <span className='text-2xl font-bold sm:text-3xl'>{title}</span>
          <ChevronDown className='size-5' />
        </Link>
      </div>
    </header>
  );
};

export default BoardHeader;
