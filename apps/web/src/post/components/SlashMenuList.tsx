import {
  Heading1,
  Heading2,
  Image as ImageIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  type LucideIcon,
} from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useState, type MouseEvent } from 'react';
import type { SlashMenuItem, SlashMenuItemId } from '@/post/utils/slashMenuItems';
import { cn } from '@/shared/utils/cn';

export interface SlashMenuListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface SlashMenuListProps {
  items: SlashMenuItem[];
  command: (item: SlashMenuItem) => void;
}

const ICONS: Record<SlashMenuItemId, LucideIcon> = {
  image: ImageIcon,
  heading1: Heading1,
  heading2: Heading2,
  quote: Quote,
  bulletList: List,
  orderedList: ListOrdered,
  divider: Minus,
};

/** 옵션을 눌러도 에디터의 포커스(와 모바일 키보드)가 빠지지 않게 한다. */
const keepEditorFocus = (event: MouseEvent<HTMLButtonElement>) => event.preventDefault();

/**
 * Slash menu popover body. The TipTap suggestion `render` mounts this and drives
 * keyboard nav through the imperative `onKeyDown` handle (arrows/enter);
 * pointer and touch users tap an option.
 */
export const SlashMenuList = forwardRef<SlashMenuListHandle, SlashMenuListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    const select = (index: number) => {
      const item = items[index];
      if (item) command(item);
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (!items.length) return false;
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          select(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (!items.length) return null;

    return (
      <div
        role="listbox"
        aria-label="블록 삽입"
        data-testid="slash-menu"
        className="reading-shadow z-50 max-h-[min(18rem,40dvh)] w-64 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border border-border/50 bg-popover p-1"
      >
        {items.map((item, index) => {
          const Icon = ICONS[item.id];
          return (
            <button
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              key={item.id}
              onMouseDown={keepEditorFocus}
              onClick={() => select(index)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                'flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm',
                index === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-foreground',
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.title}</span>
            </button>
          );
        })}
      </div>
    );
  },
);

SlashMenuList.displayName = 'SlashMenuList';
