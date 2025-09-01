import { useMemo } from 'react';
import { type Post, PostVisibility } from '@/post/model/Post';
import { getContentPreview } from '@/post/utils/contentUtils';
import { useRemoteConfig } from '@/shared/contexts/RemoteConfigContext';
import { usePostProfileBadges } from '@/stats/hooks/usePostProfileBadges';
import { useUser } from '@/user/hooks/useUser';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { PostAuthorData } from '@/post/components/PostUserProfile';

export interface UsePostCardReturn {
  authorData: PostAuthorData;
  isAuthorLoading: boolean;
  badges: any;
  isPrivate: boolean;
  contentPreview: string | null;
  statPageEnabled: boolean;
}

export const usePostCard = (post: Post): UsePostCardReturn => {
  const { userData: authorUser, isLoading: isAuthorLoading } = useUser(post.authorId);
  const { value: statPageEnabled } = useRemoteConfig('stat_page_enabled');
  const { data: badges } = usePostProfileBadges(post.authorId);

  const isPrivate = post.visibility === PostVisibility.PRIVATE;
  const contentPreview = useMemo(
    () => (!isPrivate ? getContentPreview(post.content) : null),
    [post.content, isPrivate],
  );

  const authorData: PostAuthorData = useMemo(
    () => ({
      id: post.authorId,
      displayName: getUserDisplayName(authorUser),
      profileImageURL: authorUser?.profilePhotoURL || '',
    }),
    [post.authorId, authorUser],
  );

  return {
    authorData,
    isAuthorLoading,
    badges,
    isPrivate,
    contentPreview,
    statPageEnabled: Boolean(statPageEnabled),
  };
};
