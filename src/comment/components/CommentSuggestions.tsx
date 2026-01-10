import { RefreshCw } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useRemoteConfig } from '@/shared/contexts/RemoteConfigContext';
import { Button } from '@/shared/ui/button';
import { CommentSuggestionCard } from './CommentSuggestionCard';
import { CommentSuggestionSkeleton } from './CommentSuggestionSkeleton';
import { useCommentSuggestions } from '../hooks/useCommentSuggestions';
import type { CommentSuggestion } from '../model/CommentSuggestion';

interface CommentSuggestionsProps {
  postId: string;
  boardId: string;
  onSuggestionSelect: (text: string) => void;
}

interface LoadingStateProps {
  children?: never;
}

interface ErrorStateProps {
  error: Error | null;
  onRetry: () => void;
}

interface SuccessStateProps {
  suggestions: CommentSuggestion[];
  selectedIndex: number | null;
  onSuggestionSelect: (index: number, text: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

// Loading state component
function LoadingState(_props: LoadingStateProps) {
  return (
    <div className='mb-3 sm:mb-4'>
      <div className='mb-2 flex items-center gap-2 sm:mb-3'>
        <span className='text-sm font-medium'>💡 댓글 제안</span>
        <div className='size-2 animate-pulse rounded-full bg-primary sm:hidden' />
        <div className='hidden size-3 animate-spin rounded-full border-2 border-primary border-t-transparent sm:block' />
      </div>
      <CommentSuggestionSkeleton />
    </div>
  );
}

// Error state component
function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className='mb-3 rounded-lg border border-red-200 bg-red-50 p-3 sm:mb-4'>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm text-red-800'>Failed to load suggestions</p>
          <p className='mt-1 text-xs text-red-600'>
            {error?.message || 'Something went wrong'}
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={onRetry}
          className='border-red-300 text-red-700 hover:bg-red-100'
        >
          <RefreshCw className='mr-1 size-3' />
          Retry
        </Button>
      </div>
    </div>
  );
}

// Refresh button component
function RefreshButton({ 
  onRefresh, 
  isLoading 
}: { 
  onRefresh: () => void; 
  isLoading: boolean; 
}) {
  return (
    <Button
      variant='ghost'
      size='sm'
      onClick={onRefresh}
      disabled={isLoading}
      className='size-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-50'
      title='댓글 제안 새로고침'
    >
      {isLoading ? (
        <>
          <div className='size-2 animate-pulse rounded-full bg-current sm:hidden' />
          <div className='hidden size-3 animate-spin rounded-full border-2 border-current border-t-transparent sm:block' />
        </>
      ) : (
        <RefreshCw className='size-3' />
      )}
    </Button>
  );
}

// Success state component
function SuccessState({
  suggestions,
  selectedIndex,
  onSuggestionSelect,
  onRefresh,
  isLoading,
}: SuccessStateProps) {
  return (
    <div className='mb-3 sm:mb-4'>
      <div className='mb-2 flex items-center gap-2 sm:mb-3'>
        <span className='text-sm font-medium'>💡 댓글 제안</span>
        <RefreshButton onRefresh={onRefresh} isLoading={isLoading} />
      </div>

      <div className='scrollbar-hide flex gap-2 overflow-x-auto pb-2 sm:gap-3'>
        {suggestions.map((suggestion, index) => (
          <CommentSuggestionCard
            key={`${suggestion.type}-${index}`}
            suggestion={suggestion}
            selected={selectedIndex === index}
            onSelect={() => onSuggestionSelect(index, suggestion.text)}
          />
        ))}
      </div>
    </div>
  );
}

// Main component
export function CommentSuggestions({
  postId,
  boardId,
  onSuggestionSelect,
}: CommentSuggestionsProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { value: commentAssistantEnabled } = useRemoteConfig('comment_assistant_enabled');

  const {
    data: suggestions,
    isLoading,
    isError,
    error,
    refresh,
  } = useCommentSuggestions({
    postId,
    boardId,
    enabled: commentAssistantEnabled,
  });

  const handleSuggestionSelect = useCallback(
    (index: number, text: string) => {
      setSelectedIndex(index);
      onSuggestionSelect(text);
    },
    [onSuggestionSelect]
  );

  const handleRetry = useCallback(() => {
    refresh();
  }, [refresh]);

  // Early returns for different states
  if (!commentAssistantEnabled) return null;
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error as Error | null} onRetry={handleRetry} />;
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <SuccessState
      suggestions={suggestions}
      selectedIndex={selectedIndex}
      onSuggestionSelect={handleSuggestionSelect}
      onRefresh={refresh}
      isLoading={isLoading}
    />
  );
}
