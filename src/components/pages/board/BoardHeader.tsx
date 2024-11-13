import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { firestore } from '../../../firebase';
import { doc, getDoc } from 'firebase/firestore';

interface BoardHeaderProps {
  boardId: string | undefined;
}

const BoardHeader: React.FC<BoardHeaderProps> = ({ boardId }) => {
  const [title, setTitle] = useState<string>('Loading...');

  useEffect(() => {
    const fetchBoardTitle = async () => {
      try {
        if (!boardId) {
          console.error('No boardId provided');
          setTitle('Board not found');
          return;
        }
        
        const boardDocRef = doc(firestore, 'boards', boardId);
        const boardDoc = await getDoc(boardDocRef);
        if (boardDoc.exists()) {
          const boardData = boardDoc.data();
          setTitle(boardData?.title || 'Board');
        } else {
          console.error('Board not found');
          setTitle('Board not found');
        }
      } catch (error) {
        console.error('Error fetching board title:', error);
        setTitle('Error loading title');
      }
    };

    fetchBoardTitle();
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