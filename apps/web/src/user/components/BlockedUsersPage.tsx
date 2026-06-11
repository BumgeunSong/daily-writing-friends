import { useCallback, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { useBlockedUsersList } from '@/user/hooks/useBlockedUsersList';
import { useCloseSuggestionsOnOutsideClick } from '@/user/hooks/useCloseSuggestionsOnOutsideClick';
import type { User } from '@/user/model/User';
import {
  getNextSuggestionIndex,
  isCloseSuggestionsKey,
} from '@/user/utils/blockedUsersUtils';
import BlockLimitDialog from './BlockLimitDialog';
import BlockedUserSearchCard from './BlockedUserSearchCard';
import BlockedUsersHeader from './BlockedUsersHeader';
import BlockedUsersListCard from './BlockedUsersListCard';

export default function BlockedUsersPage() {
  const { currentUser } = useAuth();
  const { blockedUsers, loading, isAtLimit, block, unblock } = useBlockedUsersList(currentUser);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [confirmUnblockUid, setConfirmUnblockUid] = useState<string | null>(null);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const closeSuggestions = useCallback(() => setShowSuggestions(false), []);
  useCloseSuggestionsOnOutsideClick(searchInputRef, suggestionsRef, closeSuggestions);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(value.trim().length > 0);
    setSelectedSuggestionIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!showSuggestions) return;
    const nextIndex = getNextSuggestionIndex(selectedSuggestionIndex, e.key);
    if (nextIndex !== null) {
      e.preventDefault();
      setSelectedSuggestionIndex(nextIndex);
      return;
    }
    if (isCloseSuggestionsKey(e.key)) {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleBlock = async (user: User) => {
    const outcome = await block(user);
    if (outcome.kind === 'limit-exceeded') {
      setShowLimitDialog(true);
      return;
    }
    if (outcome.kind === 'success') {
      setSearchQuery('');
      setShowSuggestions(false);
    }
  };

  const handleUnblock = async (uid: string) => {
    const outcome = await unblock(uid);
    if (outcome.kind === 'success') setConfirmUnblockUid(null);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <BlockedUsersHeader />
        <BlockedUserSearchCard
          searchQuery={searchQuery}
          showSuggestions={showSuggestions}
          isAtLimit={isAtLimit}
          loading={loading}
          selectedSuggestionIndex={selectedSuggestionIndex}
          blockedUsers={blockedUsers}
          currentUser={currentUser as User | null}
          searchInputRef={searchInputRef}
          suggestionsRef={suggestionsRef}
          onSearchChange={handleSearchChange}
          onSearchFocus={() => searchQuery.trim() && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          onClearSearch={clearSearch}
          onBlock={handleBlock}
          onSuggestionActivate={setSelectedSuggestionIndex}
        />
        <BlockedUsersListCard
          blockedUsers={blockedUsers}
          loading={loading}
          confirmUnblockUid={confirmUnblockUid}
          onRequestUnblock={setConfirmUnblockUid}
          onCancelUnblock={() => setConfirmUnblockUid(null)}
          onConfirmUnblock={handleUnblock}
        />
        <BlockLimitDialog open={showLimitDialog} onOpenChange={setShowLimitDialog} />
      </div>
    </div>
  );
}
