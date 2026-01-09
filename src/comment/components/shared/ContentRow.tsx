import { Edit, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { sanitizeCommentContent } from '@/post/utils/contentUtils';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { useUser } from '@/user/hooks/useUser';
import ReactionList from '../ReactionList';
import type { ContentItem, ContentType } from '@/comment/model/ContentItem';
import type { CommentParams, ReplyParams } from '@/comment/hooks/useReactions';
import type React from 'react';

interface ContentRowProps {
  item: ContentItem;
  contentType: ContentType;
  isAuthor: boolean;
  onEdit: (content: string) => Promise<void>;
  onDelete: () => Promise<void>;
  reactionEntity: CommentParams | ReplyParams;
  deleteConfirmMessage: string;
  renderInput: (props: { onSubmit: (content: string) => Promise<void>; initialValue: string }) => React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Shared component for displaying comment/reply content rows
 * This is an imperative shell - handles UI state and delegates to pure utilities
 */
export function ContentRow({
  item,
  contentType,
  isAuthor,
  onEdit,
  onDelete,
  reactionEntity,
  deleteConfirmMessage,
  renderInput,
  children,
}: ContentRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { userData: userProfile } = useUser(item.userId);

  const handleEditToggle = () => {
    setIsEditing((prev) => !prev);
  };

  const handleDelete = async () => {
    if (window.confirm(deleteConfirmMessage)) {
      await onDelete();
    }
  };

  const handleEditSubmit = async (content: string) => {
    await onEdit(content);
    setIsEditing(false);
  };

  const EditIcon = isEditing ? X : Edit;
  const sanitizedContent = sanitizeCommentContent(item.content);
  const containerClass = contentType === 'reply' ? 'group flex flex-col space-y-3 pb-4' : 'flex flex-col space-y-3 pb-4';

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="size-6">
            <AvatarImage
              src={userProfile?.profilePhotoURL || undefined}
              alt={getUserDisplayName(userProfile) || 'User'}
              className="object-cover"
            />
            <AvatarFallback className="text-sm">
              {getUserDisplayName(userProfile)?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <p className="text-base font-semibold leading-none">{getUserDisplayName(userProfile)}</p>
          <span className="text-sm text-muted-foreground">
            {item.createdAt?.toDate().toLocaleString()}
          </span>
        </div>
        {isAuthor && (
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" onClick={handleEditToggle} className="h-6 px-2">
              <EditIcon className="size-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} className="h-6 px-2">
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="text-base">
        {isEditing ? (
          renderInput({ onSubmit: handleEditSubmit, initialValue: item.content })
        ) : (
          <div
            className="prose prose-slate whitespace-pre-wrap dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        )}
      </div>
      <ReactionList entity={reactionEntity} />
      {children}
    </div>
  );
}

export default ContentRow;
