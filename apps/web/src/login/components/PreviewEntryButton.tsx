import { useNavigate } from '@/shared/navigation';
import { Button } from '@/shared/ui/button';
import type React from 'react';

/**
 * Secondary CTA on `/join` that routes a prospect into the public preview
 * (design doc §2, §4, §9 step 5). Lives as the first child of
 * `<IntroContentSection>` so it inherits the content column's max-width and
 * padding while sitting above the program pitch.
 *
 * Styled as `outline` — deliberately distinct from the primary `cta` join
 * button (`IntroCTA`) so it reads as "show me the product" rather than
 * competing with "join now".
 */
export const PreviewEntryButton: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className='w-full'>
      <Button
        variant='outline'
        size='lg'
        className='w-full'
        onClick={() => navigate('/preview')}
      >
        매글프 미리보기
      </Button>
    </div>
  );
};
