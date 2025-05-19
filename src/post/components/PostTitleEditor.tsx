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
        'text-foreground focus:outline-none placeholder:text-muted-foreground',
        'mb-4',
        className,
      )}
      rows={1}
      {...props}
    />
  );
});

PostTitleEditor.displayName = 'PostTitleEditor';

export { PostTitleEditor };
