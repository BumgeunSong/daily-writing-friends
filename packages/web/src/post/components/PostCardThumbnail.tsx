interface PostCardThumbnailProps {
  thumbnailImageURL: string | null;
  isPrivate: boolean;
}

export const PostCardThumbnail: React.FC<PostCardThumbnailProps> = ({
  thumbnailImageURL,
  isPrivate,
}) => {
  if (isPrivate || !thumbnailImageURL) {
    return null;
  }

  return (
    <div className='w-1/3 p-3'>
      <div className='reading-shadow aspect-video w-full overflow-hidden rounded-lg bg-muted'>
        <img
          src={thumbnailImageURL || '/placeholder.svg'}
          alt='게시글 썸네일'
          className='size-full object-cover'
        />
      </div>
    </div>
  );
};
