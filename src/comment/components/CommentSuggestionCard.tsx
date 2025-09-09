import { cn } from '@/lib/utils';
import type { CommentSuggestion } from '../model/CommentSuggestion';

interface CommentSuggestionCardProps {
  suggestion: CommentSuggestion;
  selected?: boolean;
  onSelect: () => void;
}

// Type icons based on PRD specifications
const TYPE_ICONS = {
  trait: '💭',
  highlight: '✨',
  empathy: '💙',
  curiosity: '❓',
} as const;

const TYPE_LABELS = {
  trait: 'Trait Recognition',
  highlight: 'Highlight Appreciation',
  empathy: 'Empathy Response',
  curiosity: 'Curiosity Driver',
} as const;

export function CommentSuggestionCard({
  suggestion,
  selected = false,
  onSelect,
}: CommentSuggestionCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col p-2 sm:p-3 rounded-lg border cursor-pointer transition-all duration-200',
        'hover:border-primary hover:shadow-sm',
        'min-w-[120px] max-w-[180px] sm:min-w-[150px] sm:max-w-[200px]', // Responsive card sizing
        selected && 'border-primary bg-primary/5 shadow-sm',
      )}
      onClick={onSelect}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Suggestion text */}
      <div className='flex-1'>
        <p className='text-xs sm:text-sm leading-relaxed break-words'>{suggestion.text}</p>
      </div>
    </div>
  );
}
