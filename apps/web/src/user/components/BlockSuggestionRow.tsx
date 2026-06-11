import ComposedAvatar from '@/shared/ui/ComposedAvatar';
import type { User } from '@/user/model/User';

interface BlockSuggestionRowProps {
  user: User;
  active: boolean;
  loading: boolean;
  onBlock: () => void;
  onActivate: () => void;
}

// Raw <button> instead of shadcn Button: the original page used a hand-tuned
// button with `text-left`, no shadcn ring/padding defaults, and `hover:bg-muted`
// on the whole row. Keeping it raw preserves the exact appearance.
export default function BlockSuggestionRow({
  user,
  active,
  loading,
  onBlock,
  onActivate,
}: BlockSuggestionRowProps) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted ${
        active ? 'bg-muted' : ''
      }`}
      onClick={onBlock}
      disabled={loading}
      onMouseEnter={onActivate}
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
    </button>
  );
}
