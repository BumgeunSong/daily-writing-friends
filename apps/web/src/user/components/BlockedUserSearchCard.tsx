import { Search, X } from 'lucide-react';
import { Suspense, type ChangeEvent, type KeyboardEvent, type RefObject } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import type { User } from '@/user/model/User';
import { MAX_BLOCKED_USERS } from '@/user/utils/blockedUsersUtils';
import BlockSuggestionsDropdown from './BlockSuggestionsDropdown';

interface BlockedUserSearchCardProps {
  searchQuery: string;
  showSuggestions: boolean;
  isAtLimit: boolean;
  loading: boolean;
  selectedSuggestionIndex: number;
  blockedUsers: User[];
  currentUser: User | null;
  searchInputRef: RefObject<HTMLInputElement | null>;
  suggestionsRef: RefObject<HTMLDivElement | null>;
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSearchFocus: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onClearSearch: () => void;
  onBlock: (user: User) => void;
  onSuggestionActivate: (index: number) => void;
}

export default function BlockedUserSearchCard({
  searchQuery,
  showSuggestions,
  isAtLimit,
  loading,
  selectedSuggestionIndex,
  blockedUsers,
  currentUser,
  searchInputRef,
  suggestionsRef,
  onSearchChange,
  onSearchFocus,
  onKeyDown,
  onClearSearch,
  onBlock,
  onSuggestionActivate,
}: BlockedUserSearchCardProps) {
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
              onChange={onSearchChange}
              onKeyDown={onKeyDown}
              onFocus={onSearchFocus}
              className="px-10"
              disabled={loading || isAtLimit}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
                onClick={onClearSearch}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          {showSuggestions && searchQuery.trim() && (
            <Suspense fallback={<SearchingFallback />}>
              <BlockSuggestionsDropdown
                searchQuery={searchQuery}
                blockedUsers={blockedUsers}
                currentUser={currentUser}
                selectedIndex={selectedSuggestionIndex}
                loading={loading}
                suggestionsRef={suggestionsRef}
                onBlock={onBlock}
                onActivate={onSuggestionActivate}
              />
            </Suspense>
          )}
        </div>

        {isAtLimit && (
          <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            💡 비공개 사용자는 최대 {MAX_BLOCKED_USERS}명까지 설정할 수 있습니다
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SearchingFallback() {
  return (
    <div className="absolute inset-x-0 top-full z-50 mt-1 rounded-md border bg-background p-4 text-center text-muted-foreground shadow-lg">
      검색 중...
    </div>
  );
}
