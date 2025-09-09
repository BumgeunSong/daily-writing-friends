import { cn } from '@/lib/utils';
import type { CommentSuggestion } from '../hooks/useCommentSuggestions';

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
        'flex flex-col p-3 rounded-lg border cursor-pointer transition-all duration-200',
        'hover:border-primary hover:shadow-sm',
        'min-w-[150px] max-w-[200px]', // Card sizing from PRD
        selected && 'border-primary bg-primary/5 shadow-sm'
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Type icon and label */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg" role="img" aria-label={TYPE_LABELS[suggestion.type]}>
          {TYPE_ICONS[suggestion.type]}
        </span>
        <span className="text-xs text-muted-foreground capitalize">
          {suggestion.type}
        </span>
      </div>

      {/* Suggestion text */}
      <div className="flex-1">
        <p className="text-sm leading-relaxed break-words">
          {suggestion.text}
        </p>
      </div>

      {/* Action hint */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <span className="text-xs text-muted-foreground">
          {selected ? '✓ Selected' : 'Tap to use'}
        </span>
      </div>
    </div>
  );
}