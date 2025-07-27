import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Card, CardContent } from '@/shared/ui/card';
import { UserCommentingStats } from '@/stats/hooks/useCommentingStats';
import { ContributionGraph } from './ContributionGraph';

interface UserCommentStatsCardProps {
  stats: UserCommentingStats;
  onClick?: () => void;
}

export function UserCommentStatsCard({ stats, onClick }: UserCommentStatsCardProps) {
  const { user, contributions } = stats;

  return (
    <Card className='w-full reading-shadow border-border/50'>
      <CardContent
        className='flex items-start gap-4 px-3 md:px-4 py-4 cursor-pointer reading-hover reading-focus active:scale-[0.99] transition-all duration-200'
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <div className='flex flex-1 items-start gap-4'>
          <Avatar className='size-12 shrink-0'>
            <AvatarImage src={user.profilePhotoURL || undefined} alt={user.nickname || 'User'} />
            <AvatarFallback>{user.nickname?.[0] || user.realname?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className='flex min-w-0 flex-col gap-1.5'>
            <h3 className='truncate font-medium text-foreground'>
              {user.nickname || user.realname || 'Anonymous'}
            </h3>
            {/* bio 등 추가 정보 필요시 여기에 */}
          </div>
        </div>
        <div className='flex shrink-0 flex-col items-end gap-2'>
          <ContributionGraph type='commenting' contributions={contributions} className='w-24' />
        </div>
      </CardContent>
    </Card>
  );
}
