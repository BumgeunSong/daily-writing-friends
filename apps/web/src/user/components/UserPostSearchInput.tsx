import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/utils/cn';

const DEBOUNCE_MS = 300;

interface UserPostSearchInputProps {
  onDebouncedChange: (debounced: string) => void;
  onEscape?: () => void;
  initialValue?: string;
  className?: string;
}

export function UserPostSearchInput({
  onDebouncedChange,
  onEscape,
  initialValue = '',
  className,
}: UserPostSearchInputProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mount-only: autofocus + cleanup of any pending debounce timer on unmount.
  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only setup
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onDebouncedChange(next);
    }, DEBOUNCE_MS);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onEscape?.();
    }
  };

  return (
    <input
      ref={inputRef}
      type="search"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      maxLength={100}
      inputMode="search"
      enterKeyHint="search"
      aria-label="내 글 검색어"
      placeholder="제목·본문 검색"
      className={cn(
        'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    />
  );
}
