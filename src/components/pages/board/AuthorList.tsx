import React, { useEffect, useState, useCallback } from 'react';

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
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  const updateAuthors = useCallback(() => {
    const newHour = new Date().getHours();
    if (newHour !== currentHour) {
      setCurrentHour(newHour);
      const seed = getHourBasedSeed();
      setAuthors(prev => shuffleArray(prev, seed));
    }
  }, [currentHour]);

  // 다음 시간까지 남은 시간(ms)을 계산
  const getTimeUntilNextHour = () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    return nextHour.getTime() - now.getTime();
  };

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

    // 다음 시간까지 정확한 타이밍으로 대기
    const timeout = setTimeout(() => {
      updateAuthors();
      // 이후 1시간 간격으로 실행
      const hourlyInterval = setInterval(updateAuthors, 3600000);
      return () => clearInterval(hourlyInterval);
    }, getTimeUntilNextHour());

    return () => clearTimeout(timeout);
  }, [boardId, updateAuthors]);

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
