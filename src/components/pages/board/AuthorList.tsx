import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { ScrollArea, ScrollBar } from '../../ui/scroll-area';
import { fetchAllUserData } from '@/utils/userUtils';
import { User } from '@/types/User';

interface AuthorListProps {
  onAuthorSelect: (authorId: string) => void;
}

const AuthorList: React.FC<AuthorListProps> = ({ onAuthorSelect }) => {
  const [authors, setAuthors] = useState<User[]>([]);

  useEffect(() => {
    const fetchAuthors = async () => {
        try {
            const authorData = await fetchAllUserData();
            setAuthors(authorData);

        } catch (error) {
            console.error('Error fetching author data:', error);
        }
    };
    fetchAuthors();
  }, []);

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-md border">
      <div className="flex w-max space-x-4 p-4">
        {authors.map((author) => (
          <button
            key={author.uid}
            className="flex flex-col items-center space-y-1"
            onClick={() => onAuthorSelect(author.uid)}
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={author.profilePhotoURL || ''} alt={author.nickname || ''} />
              <AvatarFallback>{author.nickname?.slice(0, 2).toUpperCase() || ''}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium">{author.nickname}</span>
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

export default AuthorList;