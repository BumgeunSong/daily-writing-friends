import { CardContent } from '@/shared/ui/card';

interface PostCardContentProps {
  contentPreview: string | null;
  thumbnailImageURL?: string | null;
  isPrivate: boolean;
  isMobile?: boolean;
  isDesktop?: boolean;
}

export const PostCardContent: React.FC<PostCardContentProps> = ({
  contentPreview,
  thumbnailImageURL,
  isPrivate,
  isMobile = false,
  isDesktop = false,
}) => {
  return (
    <CardContent
      className={`min-h-[44px] pb-3 pt-1 ${
        isMobile ? 'px-3 md:px-4' : 'px-4'
      } ${isDesktop ? 'flex-1' : ''}`}
    >
      {!isPrivate && contentPreview && (
        <div
          className='
text-reading-sm prose prose-sm 
line-clamp-3
max-w-none
text-foreground/85
dark:prose-invert
prose-headings:text-foreground
prose-p:my-1.5
prose-a:text-ring
prose-strong:text-foreground/90
prose-ol:my-1.5
prose-ul:my-1.5'
          dangerouslySetInnerHTML={{ __html: contentPreview }}
        />
      )}
      {/* Mobile thumbnail */}
      {isMobile && !isPrivate && thumbnailImageURL && (
        <div className='reading-shadow mt-4 aspect-video w-full overflow-hidden rounded-lg bg-muted'>
          <img
            src={thumbnailImageURL || '/placeholder.svg'}
            alt='게시글 썸네일'
            className='size-full object-cover'
          />
        </div>
      )}
    </CardContent>
  );
};
