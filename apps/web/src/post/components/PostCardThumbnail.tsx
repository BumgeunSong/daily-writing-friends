import { useThumbnailUrl } from '@/shared/hooks/useThumbnailUrl';

interface PostCardThumbnailProps {
  thumbnailImageURL: string | null;
  isPrivate: boolean;
}

export const PostCardThumbnail: React.FC<PostCardThumbnailProps> = ({
  thumbnailImageURL,
  isPrivate,
}) => {
  const shouldLoadThumbnail = !isPrivate && !!thumbnailImageURL;
  const optimizedUrl = useThumbnailUrl(shouldLoadThumbnail ? thumbnailImageURL : null);

  if (!shouldLoadThumbnail) {
    return null;
  }

  return (
    <div className='w-1/3 p-3'>
      <div className='reading-shadow aspect-video w-full overflow-hidden rounded-lg bg-muted'>
        <img
          src={optimizedUrl || '/placeholder.svg'}
          alt='게시글 썸네일'
          className='size-full object-cover ring-1 ring-black/10 dark:ring-white/10 rounded-lg'
          loading='lazy'
          decoding='async'
          width={391}
          height={220}
        />
      </div>
    </div>
  );
};
