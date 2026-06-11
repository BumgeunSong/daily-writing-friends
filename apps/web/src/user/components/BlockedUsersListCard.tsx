import { UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Separator } from '@/shared/ui/separator';
import type { User } from '@/user/model/User';
import { MAX_BLOCKED_USERS } from '@/user/utils/blockedUsersUtils';
import BlockedUserRow from './BlockedUserRow';

interface BlockedUsersListCardProps {
  blockedUsers: User[];
  loading: boolean;
  confirmUnblockUid: string | null;
  onRequestUnblock: (uid: string) => void;
  onCancelUnblock: () => void;
  onConfirmUnblock: (uid: string) => void;
}

export default function BlockedUsersListCard({
  blockedUsers,
  loading,
  confirmUnblockUid,
  onRequestUnblock,
  onCancelUnblock,
  onConfirmUnblock,
}: BlockedUsersListCardProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">비공개 사용자 목록</CardTitle>
          <span className="text-sm text-muted-foreground">
            {blockedUsers.length}/{MAX_BLOCKED_USERS}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {blockedUsers.length === 0 ? <EmptyState /> : (
          <div className="space-y-3">
            {blockedUsers.map((user, index) => (
              <div key={user.uid}>
                <BlockedUserRow
                  user={user}
                  loading={loading}
                  isConfirming={confirmUnblockUid === user.uid}
                  onRequestUnblock={() => onRequestUnblock(user.uid)}
                  onCancelUnblock={onCancelUnblock}
                  onConfirmUnblock={() => onConfirmUnblock(user.uid)}
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

function EmptyState() {
  return (
    <div className="py-8 text-center text-muted-foreground">
      <UserX className="mx-auto mb-3 size-12 opacity-50" />
      <p>비공개 사용자가 없습니다</p>
      <p className="mt-1 text-sm">위에서 사용자를 검색하여 추가해보세요</p>
    </div>
  );
}
