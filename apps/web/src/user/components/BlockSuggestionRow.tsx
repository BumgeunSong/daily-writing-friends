import { Button } from '@/shared/ui/button';
import ComposedAvatar from '@/shared/ui/ComposedAvatar';
import type { User } from '@/user/model/User';

interface BlockSuggestionRowProps {
  user: User;
  active: boolean;
  loading: boolean;
  onBlock: () => void;
  onActivate: () => void;
}

export default function BlockSuggestionRow({
  user,
  active,
  loading,
  onBlock,
  onActivate,
}: BlockSuggestionRowProps) {
  return (
    <Button
      variant="ghost"
      asChild={false}
      onClick={onBlock}
      disabled={loading}
      onMouseEnter={onActivate}
      className={`flex h-auto w-full items-center justify-start gap-3 rounded-none p-3 text-left hover:bg-muted ${
        active ? 'bg-muted' : ''
      }`}
    >
      <ComposedAvatar
        className="shrink-0"
        size={32}
        src={user.profilePhotoURL || undefined}
        alt={user.nickname || 'User'}
        fallback={user.nickname?.[0] || ''}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{user.nickname}</div>
        <div className="truncate text-sm text-muted-foreground">{user.email}</div>
      </div>
    </Button>
  );
}
