import React, { useRef, useEffect } from 'react';
import { cn } from "@/shared/utils/cn";

interface PostTitleEditorProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const PostTitleEditor = React.forwardRef<
  HTMLTextAreaElement,
  PostTitleEditorProps
>(({ className, value, onChange, placeholder = '제목을 입력하세요', ...props }, ref) => {
  const innerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (innerRef.current) {
      innerRef.current.style.height = 'auto';
      innerRef.current.style.height = `${innerRef.current.scrollHeight}px`;
    }
  }, [value]);

  useEffect(() => {
    if (typeof ref === 'function') {
      ref(innerRef.current);
    } else if (ref) {
      ref.current = innerRef.current;
    }
  }, [ref]);

  return (
    <textarea
      ref={innerRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(
        'w-full resize-none overflow-hidden text-3xl sm:text-4xl font-bold leading-tight tracking-tight',
        'text-foreground placeholder:text-muted-foreground bg-card',
        'reading-focus transition-all duration-200',
        'px-3 py-2 md:px-4 md:py-3',
        'mb-4 rounded-xl border border-border/50 reading-shadow',
        className,
      )}
      rows={1}
      maxLength={100}
      {...props}
    />
  );
});

PostTitleEditor.displayName = 'PostTitleEditor';

export { PostTitleEditor };
