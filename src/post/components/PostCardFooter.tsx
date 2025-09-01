import { MessageCircle } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { CardFooter } from '@/shared/ui/card';

interface PostCardFooterProps {
  countOfComments: number;
  countOfReplies: number;
  weekDaysFromFirstDay?: number;
}

export const PostCardFooter: React.FC<PostCardFooterProps> = ({
  countOfComments,
  countOfReplies,
  weekDaysFromFirstDay,
}) => {
  return (
    <CardFooter className='flex min-h-[44px] justify-between border-t border-border/50 p-3 md:px-4'>
      <div className='flex items-center text-muted-foreground'>
        <MessageCircle className='mr-1.5 size-4' />
        <p className='text-sm font-medium'>{countOfComments + countOfReplies}</p>
      </div>
      {weekDaysFromFirstDay !== undefined && (
        <Badge
          className='reading-shadow h-6 border-border bg-secondary/80 px-2.5 py-1 text-xs font-medium text-muted-foreground'
          variant='outline'
        >
          {weekDaysFromFirstDay + 1}일차
        </Badge>
      )}
    </CardFooter>
  );
};
