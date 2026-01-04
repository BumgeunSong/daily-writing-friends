import { useState } from 'react';
import { UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Separator } from '@/shared/ui/separator';
import type { BlockedUser } from '@/user/hooks/useBlockedUsers';
import { BlockedUserItem } from './BlockedUserItem';

interface BlockedUsersListProps {
  blockedUsers: BlockedUser[];
  blockedCount: number;
  maxBlockedUsers: number;
  isLoading: boolean;
  onUnblock: (uid: string) => Promise<boolean>;
}

export function BlockedUsersList({
  blockedUsers,
  blockedCount,
  maxBlockedUsers,
  isLoading,
  onUnblock,
}: BlockedUsersListProps) {
  const [confirmUnblockUid, setConfirmUnblockUid] = useState<string | null>(null);

  const handleUnblock = async (uid: string) => {
    const success = await onUnblock(uid);
    if (success) {
      setConfirmUnblockUid(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">비공개 사용자 목록</CardTitle>
          <span className="text-sm text-muted-foreground">
            {blockedCount}/{maxBlockedUsers}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {blockedUsers.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <UserX className="mx-auto mb-3 size-12 opacity-50" />
            <p>비공개 사용자가 없습니다</p>
            <p className="mt-1 text-sm">위에서 사용자를 검색하여 추가해보세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((user, index) => (
              <div key={user.uid}>
                <BlockedUserItem
                  user={user}
                  isConfirmOpen={confirmUnblockUid === user.uid}
                  onConfirmOpen={() => setConfirmUnblockUid(user.uid)}
                  onConfirmClose={() => setConfirmUnblockUid(null)}
                  onUnblock={() => handleUnblock(user.uid)}
                  isLoading={isLoading}
                />
                {index < blockedUsers.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
