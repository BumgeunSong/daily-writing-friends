import { Stack } from '@/shared/ui/stack';
import { UserPostingStatsCard } from '@/stats/components/UserPostingStatsCard';
import type { WritingStats } from '@/stats/model/WritingStats';

interface PostingStatsShowcaseProps {
  statsList: WritingStats[];
}

/**
 * 서로 다른 잔디 상태(꽉 채운 고인물·현실적·새싹)를 세로로 나란히 보여준다.
 * 방문자가 "며칠 빠져도 괜찮구나"를 한눈에 느끼도록 여러 리듬을 함께 노출한다.
 */
export function PostingStatsShowcase({ statsList }: PostingStatsShowcaseProps) {
  return (
    <Stack gap='sm' className='w-full'>
      {statsList.map((stats) => (
        <UserPostingStatsCard key={stats.user.id} stats={stats} />
      ))}
    </Stack>
  );
}
