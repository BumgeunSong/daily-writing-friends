import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
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
    <header className="bg-primary text-primary-foreground py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link
          to="/boards/list"
          className="flex items-center space-x-2 p-2 rounded hover:bg-primary-foreground/10 transition"
        >
          <span className="text-2xl font-bold sm:text-3xl">{title}</span>
          <ChevronDown className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
};

export default BoardHeader;