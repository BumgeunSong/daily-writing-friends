import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { ScrollArea, ScrollBar } from '../../ui/scroll-area';
import { useAuthors } from '@/hooks/useAuthors';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthorListProps {
  boardId: string;
  onAuthorSelect: (authorId: string) => void;
}

const AuthorList: React.FC<AuthorListProps> = ({ boardId, onAuthorSelect }) => {
  const { authors, isLoading, error } = useAuthors(boardId);

  if (error) {
    return (<div/>);
  }

  if (isLoading) {
    return (
      <ScrollArea className='w-full whitespace-nowrap rounded-md border'>
        <div className='flex w-max space-x-4 p-4'>
          {[...Array(5)].map((_, i) => (
            <div key={i} className='flex flex-col items-center space-y-1'>
              <Skeleton className='size-12 rounded-full' />
              <Skeleton className='h-4 w-20' />
            </div>
          ))}
        </div>
        <ScrollBar orientation='horizontal' />
      </ScrollArea>
    );
  }

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
