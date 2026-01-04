import { useState, useRef, useEffect, Suspense, KeyboardEvent, ChangeEvent } from 'react';
import { Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import type { BlockedUser } from '@/user/hooks/useBlockedUsers';
import { SuggestionsDropdown } from './SuggestionsDropdown';

interface BlockedUsersSearchSectionProps {
  blockedUsers: BlockedUser[];
  isAtLimit: boolean;
  isLoading: boolean;
  currentUserUid: string | undefined;
  currentUserBoardPermissions: Record<string, string> | undefined;
  onBlockUser: (user: BlockedUser) => Promise<boolean>;
  onShowLimitDialog: () => void;
}

export function BlockedUsersSearchSection({
  blockedUsers,
  isAtLimit,
  isLoading,
  currentUserUid,
  currentUserBoardPermissions,
  onBlockUser,
  onShowLimitDialog,
}: BlockedUsersSearchSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current &&
        suggestionsRef.current &&
        !searchInputRef.current.contains(event.target as Node) &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(value.trim().length > 0);
    setSelectedSuggestionIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!showSuggestions) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => prev + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleSelectUser = async (user: BlockedUser) => {
    if (isAtLimit) {
      onShowLimitDialog();
      return;
    }
    const success = await onBlockUser(user);
    if (success) {
      setSearchQuery('');
      setShowSuggestions(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">사용자 검색</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="닉네임 또는 이메일로 검색"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
              className="px-10"
              disabled={isLoading || isAtLimit}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
                onClick={clearSearch}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          {showSuggestions && searchQuery.trim() && (
            <Suspense
              fallback={
                <div className="absolute inset-x-0 top-full z-50 mt-1 rounded-md border bg-background p-4 text-center text-muted-foreground shadow-lg">
                  검색 중...
                </div>
              }
            >
              <SuggestionsDropdown
                searchQuery={searchQuery}
                blockedUsers={blockedUsers}
                currentUserUid={currentUserUid}
                currentUserBoardPermissions={currentUserBoardPermissions}
                onSelectUser={handleSelectUser}
                selectedIndex={selectedSuggestionIndex}
                onHoverIndex={setSelectedSuggestionIndex}
                isLoading={isLoading}
                suggestionsRef={suggestionsRef}
              />
            </Suspense>
          )}
        </div>

        {isAtLimit && (
          <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            비공개 사용자는 최대 10명까지 설정할 수 있습니다
          </div>
        )}
      </CardContent>
    </Card>
  );
}
