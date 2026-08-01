import { Quote } from 'lucide-react';
import { SnapRow } from '@/shared/ui/SnapRow';
import { testimonialReviews } from '../data/testimonialReviews';

export default function ReviewCarousel() {
  return (
    <div className='w-full space-y-4'>
      <h2 className='px-6 text-xl font-bold md:text-2xl'>&apos;매생이&apos;들의 후기</h2>
      <SnapRow className='px-6'>
        {testimonialReviews.map((review) => (
          <div
            key={review.id}
            className='flex w-[80%] shrink-0 snap-start flex-col items-center justify-center gap-4 rounded-lg border border-border/50 bg-muted/10 p-6 text-center md:w-[55%]'
          >
            <Quote className='size-8 text-muted-foreground/30' />
            <p className='text-base text-muted-foreground md:text-lg'>{review.content}</p>
            {review.author && <p className='text-sm text-muted-foreground/70'>- {review.author}</p>}
          </div>
        ))}
      </SnapRow>
    </div>
  );
}
