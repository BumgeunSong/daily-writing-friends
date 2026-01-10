import { Quote } from 'lucide-react';
import * as React from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from '@/shared/ui/Carousel';
import { testimonialReviews } from '../data/testimonialReviews';

export default function ReviewCarousel() {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [api, setApi] = React.useState<CarouselApi>();

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setSelectedIndex(api.selectedScrollSnap());
    api.on('select', () => {
      setSelectedIndex(api.selectedScrollSnap());
    });
  }, [api]);

  const handleDotClick = (index: number) => {
    api?.scrollTo(index);
  };

  return (
    <div className='w-full space-y-4'>
      <h2 className='px-6 text-xl font-bold md:text-2xl'>&apos;매생이&apos;들의 후기</h2>
      <Card className='border-none bg-muted/10'>
        <CardContent className='p-6 md:p-8'>
          <Carousel
            opts={{
              loop: true,
            }}
            setApi={setApi}
            className='w-full'
          >
            <CarouselContent>
              {testimonialReviews.map((review) => (
                <CarouselItem key={review.id}>
                  <div className='flex flex-col items-center justify-center space-y-4 px-4 text-center'>
                    <Quote className='size-8 text-muted-foreground/30' />
                    <p className='text-base text-muted-foreground md:text-lg'>{review.content}</p>
                    {review.author && (
                      <p className='text-sm text-muted-foreground/70'>- {review.author}</p>
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className='hidden md:flex' />
            <CarouselNext className='hidden md:flex' />
          </Carousel>

          {/* Dot indicators */}
          <div className='mt-6 flex justify-center gap-2'>
            {testimonialReviews.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={`size-2 rounded-full transition-all ${
                  selectedIndex === index ? 'w-6 bg-primary' : 'bg-muted-foreground/30'
                }`}
                aria-label={`Go to review ${index + 1}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
