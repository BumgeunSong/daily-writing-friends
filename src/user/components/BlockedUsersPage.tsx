import { useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { useBlockedUsers } from '@/user/hooks/useBlockedUsers';
import {
  BlockedUsersHeader,
  BlockedUsersSearchSection,
  BlockedUsersList,
  BlockedUsersLimitDialog,
} from './blocked-users';

export default function BlockedUsersPage() {
  const { currentUser } = useAuth();
  const {
    blockedUsers,
    isLoading,
    isAtLimit,
    blockedCount,
    maxBlockedUsers,
    blockUser,
    unblockUser,
  } = useBlockedUsers();
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <BlockedUsersHeader />

        <BlockedUsersSearchSection
          blockedUsers={blockedUsers}
          isAtLimit={isAtLimit}
          isLoading={isLoading}
          currentUserUid={currentUser?.uid}
          currentUserBoardPermissions={currentUser?.boardPermissions}
          onBlockUser={blockUser}
          onShowLimitDialog={() => setShowLimitDialog(true)}
        />

        <BlockedUsersList
          blockedUsers={blockedUsers}
          blockedCount={blockedCount}
          maxBlockedUsers={maxBlockedUsers}
          isLoading={isLoading}
          onUnblock={unblockUser}
        />

        <BlockedUsersLimitDialog
          isOpen={showLimitDialog}
          onClose={() => setShowLimitDialog(false)}
        />
      </div>
    </div>
  );
}
