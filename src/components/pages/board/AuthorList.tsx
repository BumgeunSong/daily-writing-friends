import React, { useEffect, useState } from 'react';

import { User } from '@/types/User';
import { fetchAllUserDataWithBoardPermission } from '@/utils/userUtils';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { ScrollArea, ScrollBar } from '../../ui/scroll-area';
import { getHourBasedSeed, shuffleArray } from '@/utils/shuffleUtils';

interface AuthorListProps {
  boardId: string;
  onAuthorSelect: (authorId: string) => void;
}

const AuthorList: React.FC<AuthorListProps> = ({ boardId, onAuthorSelect }) => {
  const [authors, setAuthors] = useState<User[]>([]);

  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const authorData = await fetchAllUserDataWithBoardPermission(boardId);
        const seed = getHourBasedSeed();
        const shuffledAuthors = shuffleArray(authorData, seed);
        setAuthors(shuffledAuthors);
      } catch (error) {
        console.error('Error fetching author data:', error);
      }
    };

    fetchAuthors();

    const interval = setInterval(() => {
      const seed = getHourBasedSeed();
      setAuthors(prev => shuffleArray(prev, seed));
    }, 1000 * 60);

    return () => clearInterval(interval);
  }, [boardId]);

  return (
    <ScrollArea className='w-full whitespace-nowrap rounded-md border'>
      <div className='flex w-max space-x-4 p-4'>
        {authors.map((author) => (
          <button
            key={author.uid}
            className='flex flex-col items-center space-y-1'
            onClick={() => onAuthorSelect(author.uid)}
          >
            <Avatar className='size-12'>
              <AvatarImage src={author.profilePhotoURL || ''} alt={author.nickname || ''} />
              <AvatarFallback>{author.nickname?.slice(0, 2).toUpperCase() || ''}</AvatarFallback>
            </Avatar>
            <span className='text-xs font-medium'>{author.nickname}</span>
          </button>
        ))}
      </div>
      <ScrollBar orientation='horizontal' />
    </ScrollArea>
  );
};

export default AuthorList;
