import { useState, useEffect } from 'react';
import { fetchBoardTitle } from '@/utils/boardUtils';

export function useBoardTitle(boardId: string | undefined) {
  const [boardTitle, setBoardTitle] = useState<string>('');
  
  useEffect(() => {
    const fetchTitle = async () => {
      if (boardId) {
        const title = await fetchBoardTitle(boardId);
        setBoardTitle(title);
      }
    };
    
    fetchTitle();
  }, [boardId]);
  
  return { boardTitle };
} 