import { useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { cn } from '@/shared/utils/cn';

const DEBOUNCE_MS = 300;

interface UserPostSearchInputProps {
  onDebouncedChange: (debounced: string) => void;
  onEscape?: () => void;
  className?: string;
}

export function UserPostSearchInput({
  onDebouncedChange,
  onEscape,
  className,
}: UserPostSearchInputProps) {
  const [value, setValue] = useState('');
  const debounced = useDebouncedValue(value, DEBOUNCE_MS);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onDebouncedChange(debounced);
  }, [debounced, onDebouncedChange]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <input
      ref={inputRef}
      type="search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onEscape?.();
        }
      }}
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
