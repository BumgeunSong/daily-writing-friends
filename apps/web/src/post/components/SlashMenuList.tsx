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

interface SlashMenuListProps {
  items: SlashMenuItem[];
  /** 하이라이트는 검색어가 바뀔 때만 처음으로 돌아간다. */
  query: string;
  command: (item: SlashMenuItem) => void;
}

function useSlashMenuSelection(items: SlashMenuItem[], query: string) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [query]);

  const move = (step: number) =>
    setSelectedIndex((index) => (index + step + items.length) % items.length);

  return { selectedIndex, setSelectedIndex, move };
}

/**
 * Slash menu popover body. The TipTap suggestion `render` mounts this and drives
 * keyboard nav through the imperative `onKeyDown` handle (arrows/enter);
 * pointer and touch users tap an option.
 */
export const SlashMenuList = forwardRef<SlashMenuListHandle, SlashMenuListProps>(
  ({ items, query, command }, ref) => {
    const { selectedIndex, setSelectedIndex, move } = useSlashMenuSelection(items, query);

    const select = (index: number) => {
      const item = items[index];
      if (item) command(item);
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (!items.length) return false;
        if (event.key === 'ArrowUp') move(-1);
        else if (event.key === 'ArrowDown') move(1);
        else if (event.key === 'Enter') select(selectedIndex);
        else return false;
        return true;
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
        {items.map((item, index) => (
          <SlashMenuOption
            key={item.id}
            item={item}
            selected={index === selectedIndex}
            onHover={() => setSelectedIndex(index)}
            onSelect={() => select(index)}
          />
        ))}
      </div>
    );
  },
);

SlashMenuList.displayName = 'SlashMenuList';

interface SlashMenuOptionProps {
  item: SlashMenuItem;
  selected: boolean;
  onHover: () => void;
  onSelect: () => void;
}

function SlashMenuOption({ item, selected, onHover, onSelect }: SlashMenuOptionProps) {
  const Icon = ICONS[item.id];
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onMouseDown={keepEditorFocus}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        'flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm',
        selected ? 'bg-accent text-accent-foreground' : 'text-foreground',
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="truncate">{item.title}</span>
    </button>
  );
}
