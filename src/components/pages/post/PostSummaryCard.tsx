import DOMPurify from 'dompurify';
import { MessageCircle, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Post } from '@/types/Posts';
import { User as Author } from '@/types/User';
import { fetchUserData, listenForUserDataChanges } from '@/utils/userUtils';

interface PostSummaryCardProps {
  post: Post;
  onClick: () => void;
}

const PostSummaryCard: React.FC<PostSummaryCardProps> = ({ post, onClick }) => {
  const sanitizedContent = DOMPurify.sanitize(post.content);
  const [authorData, setAuthorData] = useState<Author | null>(null);

  useEffect(() => {
    const fetchAuthorData = async () => {
      try {
        const authorData = await fetchUserData(post.authorId);
        setAuthorData(authorData);

        // Set up real-time listener for author data changes
        const unsubscribe = listenForUserDataChanges(post.authorId, (newData) => {
          setAuthorData(newData);
        });

        // Clean up the listener on component unmount
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching author data:', error);
      }
    };

    fetchAuthorData();
  }, [post.authorId]);

  return (
    <Card className='mb-4'>
      <CardHeader>
        <h2 className='text-2xl font-bold'>{post.title}</h2>
        <div className='mt-2 flex items-center'>
          <Avatar className='size-8'>
            <AvatarImage
              src={authorData?.profilePhotoURL || ''}
              alt={authorData?.realName || 'User'}
            />
            <AvatarFallback>
              <User className='size-4' />
            </AvatarFallback>
          </Avatar>
          <div className='ml-2'>
            <p className='text-sm font-medium'>{authorData?.nickname}</p>
            <p className='text-xs text-muted-foreground'>
              {post.createdAt?.toLocaleString() || '?'}
            </p>
          </div>
        </div>
      </CardHeader>
      <Link to={`/board/${post.boardId}/post/${post.id}`} onClick={onClick}>
        <CardContent className='cursor-pointer p-6 transition-colors duration-200 hover:bg-muted'>
          <div
            className='line-clamp-5'
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          ></div>
        </CardContent>
      </Link>
      <CardFooter>
        <div className='flex items-center'>
          <MessageCircle className='mr-1 size-4' />
          <p className='text-sm'>{post.comments}</p>
        </div>
      </CardFooter>
    </Card>
  );
};

export default PostSummaryCard;
