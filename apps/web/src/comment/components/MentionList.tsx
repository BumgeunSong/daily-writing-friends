import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

import ComposedAvatar from '@/shared/ui/ComposedAvatar';
import { cn } from '@/shared/utils/cn';
import type { User } from '@/user/model/User';

export interface MentionListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface MentionListProps {
  items: User[];
  command: (item: { id: string; label: string }) => void;
}

/**
 * Suggestion popover body. The TipTap suggestion `render` mounts this and drives
 * keyboard nav through the imperative `onKeyDown` handle (arrows/enter on
 * desktop, tab on mobile); pointer users click.
 */
export const MentionList = forwardRef<MentionListHandle, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    const select = (index: number) => {
      const item = items[index];
      if (item) command({ id: item.uid, label: item.nickname ?? item.uid });
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
        if (event.key === 'Enter' || event.key === 'Tab') {
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
        className="z-50 max-h-64 w-64 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
      >
        {items.map((item, index) => (
          <button
            type="button"
            role="option"
            aria-selected={index === selectedIndex}
            key={item.uid}
            onClick={() => select(index)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={cn(
              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
              index === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-foreground',
            )}
          >
            <ComposedAvatar
              src={item.profilePhotoURL}
              alt={item.nickname ?? ''}
              fallback={(item.nickname ?? 'U').slice(0, 1)}
              size={24}
            />
            <span className="truncate">{item.nickname ?? item.uid}</span>
          </button>
        ))}
      </div>
    );
  },
);

MentionList.displayName = 'MentionList';
