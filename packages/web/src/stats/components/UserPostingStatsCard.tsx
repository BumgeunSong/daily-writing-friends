import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Card, CardContent } from '@/shared/ui/card';
import { WritingStats } from '@/stats/model/WritingStats';
import { ContributionGraph } from './ContributionGraph';
import { WritingBadgeComponent } from './WritingBadgeComponent';

interface UserPostingStatsCardProps {
  stats: WritingStats;
  onClick?: () => void;
}

export function UserPostingStatsCard({ stats, onClick }: UserPostingStatsCardProps) {
  const { user, contributions } = stats;

  return (
    <Card className='w-full rounded-xl border border-border/50 bg-card shadow-sm'>
      <CardContent
        className='reading-hover reading-focus flex cursor-pointer items-start gap-4 px-3 py-4 transition-all duration-200 active:scale-[0.99] md:px-4'
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
            <h3 className='truncate text-base font-semibold text-card-foreground md:text-lg'>
              {user.nickname || user.realname || 'Anonymous'}
            </h3>
            <div className='flex flex-wrap gap-1'>
              {stats.badges.map((badge) => (
                <WritingBadgeComponent key={badge.name} badge={badge} />
              ))}
            </div>
          </div>
        </div>
        <div className='flex shrink-0 flex-col items-end gap-2'>
          <ContributionGraph type='posting' contributions={contributions} className='w-24' />
        </div>
      </CardContent>
    </Card>
  );
}
