import { useMemo, RefObject } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/ui/avatar';
import useUserSearch from '@/user/hooks/useUserSearch';
import type { BlockedUser } from '@/user/hooks/useBlockedUsers';

interface SuggestionsDropdownProps {
  searchQuery: string;
  blockedUsers: BlockedUser[];
  currentUserUid: string | undefined;
  currentUserBoardPermissions: Record<string, string> | undefined;
  onSelectUser: (user: BlockedUser) => void;
  selectedIndex: number;
  onHoverIndex: (index: number) => void;
  isLoading: boolean;
  suggestionsRef: RefObject<HTMLDivElement>;
}

export function SuggestionsDropdown({
  searchQuery,
  blockedUsers,
  currentUserUid,
  currentUserBoardPermissions,
  onSelectUser,
  selectedIndex,
  onHoverIndex,
  isLoading,
  suggestionsRef,
}: SuggestionsDropdownProps) {
  const { data: searchResult } = useUserSearch(searchQuery, currentUserBoardPermissions);

  const suggestions = useMemo(() => {
    if (!searchResult || !searchQuery.trim()) return [];
    const blockedUids = new Set(blockedUsers.map((user) => user.uid));
    const arr = Array.isArray(searchResult) ? searchResult : [searchResult];
    return arr
      .filter(
        (user) => user && user.uid !== currentUserUid && !blockedUids.has(user.uid)
      )
      .slice(0, 5)
      .map((user) => ({
        uid: user.uid,
        nickname: user.nickname ?? '',
        email: user.email,
        profilePhotoURL: user.profilePhotoURL,
      }));
  }, [searchResult, searchQuery, blockedUsers, currentUserUid]);

  if (suggestions.length > 0) {
    return (
      <div
        ref={suggestionsRef}
        className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-background shadow-lg"
      >
        {suggestions.map((user, index) => (
          <button
            key={user.uid}
            type="button"
            className={`flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted ${
              index === selectedIndex ? 'bg-muted' : ''
            }`}
            onClick={() => onSelectUser(user)}
            disabled={isLoading}
            onMouseEnter={() => onHoverIndex(index)}
          >
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={user.profilePhotoURL || '/placeholder.svg'} />
              <AvatarFallback>{user.nickname?.[0] || ''}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{user.nickname}</div>
              <div className="truncate text-sm text-muted-foreground">{user.email}</div>
            </div>
          </button>
        ))}
      </div>
    );
  }

  if (searchQuery.trim() && suggestions.length === 0) {
    return (
      <div className="absolute inset-x-0 top-full z-50 mt-1 rounded-md border bg-background p-4 text-center text-muted-foreground shadow-lg">
        검색 결과가 없습니다
      </div>
    );
  }

  return null;
}
