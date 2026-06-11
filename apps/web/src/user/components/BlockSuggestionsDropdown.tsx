import { useMemo, type RefObject } from 'react';
import useUserSearch from '@/user/hooks/useUserSearch';
import type { User } from '@/user/model/User';
import { filterBlockSuggestions } from '@/user/utils/blockedUsersUtils';
import BlockSuggestionRow from './BlockSuggestionRow';

interface BlockSuggestionsDropdownProps {
  searchQuery: string;
  blockedUsers: User[];
  currentUser: User | null;
  selectedIndex: number;
  loading: boolean;
  suggestionsRef: RefObject<HTMLDivElement | null>;
  onBlock: (user: User) => void;
  onActivate: (index: number) => void;
}

/**
 * Suspense-aware autocomplete for the "block a user" search box. Uses the
 * project-wide `useUserSearch` hook (suspense=true) and the pure
 * `filterBlockSuggestions` helper, so this file only owns layout.
 */
export default function BlockSuggestionsDropdown({
  searchQuery,
  blockedUsers,
  currentUser,
  selectedIndex,
  loading,
  suggestionsRef,
  onBlock,
  onActivate,
}: BlockSuggestionsDropdownProps) {
  const { data: searchResult } = useUserSearch(searchQuery, currentUser?.boardPermissions);
  const suggestions = useMemo(
    () => filterBlockSuggestions(searchResult, blockedUsers, currentUser?.uid, searchQuery),
    [searchResult, searchQuery, blockedUsers, currentUser?.uid],
  );

  if (suggestions.length === 0) {
    if (!searchQuery.trim()) return null;
    return (
      <div className="absolute inset-x-0 top-full z-50 mt-1 rounded-md border bg-background p-4 text-center text-muted-foreground shadow-lg">
        검색 결과가 없습니다
      </div>
    );
  }

  return (
    <div
      ref={suggestionsRef}
      className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-background shadow-lg"
    >
      {suggestions.map((user, index) => (
        <BlockSuggestionRow
          key={user.uid}
          user={user}
          active={index === selectedIndex}
          loading={loading}
          onBlock={() => onBlock(user)}
          onActivate={() => onActivate(index)}
        />
      ))}
    </div>
  );
}
