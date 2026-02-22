import { useQuery } from '@tanstack/react-query';
import { fetchCommentingData } from '@/stats/api/stats';
import { WritingBadge } from '@/stats/model/WritingStats';
import { calculateCommentTemperature } from '@/stats/utils/commentTemperature';
import type { Commenting } from '@/user/model/Commenting';
import type { Replying } from '@/user/model/Replying';

export function usePostProfileBadges(userId: string) {
  return useQuery(['postProfileBadges', userId], () => fetchUserBadges(userId), {
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5분 동안 데이터를 'fresh'하게 유지
    cacheTime: 10 * 60 * 1000, // 10분 동안 캐시 유지
  });
}

async function fetchUserBadges(userId: string): Promise<WritingBadge[]> {
  try {
    const commentingData = await fetchCommentingData(userId, 20);
    const commentingBadges = createCommentingBadges(commentingData);

    return commentingBadges;
  } catch (error) {
    console.error('Error fetching user badges:', error);
    return [];
  }
}

function createCommentingBadges(commentingData: {
  commentings: Commenting[];
  replyings: Replying[];
}): WritingBadge[] {
  const { commentings, replyings } = commentingData;
  const totalComments = commentings.length + replyings.length;
  const temperature = calculateCommentTemperature(totalComments);

  const badges: WritingBadge[] = [];

  if (temperature > 0) {
    badges.push({
      name: `${temperature}℃`,
      emoji: '🌡️',
    });
  }

  return badges;
}
