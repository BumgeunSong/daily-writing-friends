import { CommentInput } from '@/comment/components/CommentInput';
import { MentionableInput } from '@/comment/components/MentionableInput';
import ReplyInput from '@/comment/components/ReplyInput';

const NOOP = async () => {};

// Mounts one comment-input component under test, chosen by ?component=.
// Wrapped in a width box that stands in for the post-detail comment column.
export function Harness() {
  const which = new URLSearchParams(location.search).get('component') ?? 'commentInput';

  return (
    <div data-gate-root style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      {which === 'mentionable' ? (
        <MentionableInput boardId="gate-board" onSubmit={NOOP} />
      ) : which === 'replyInput' ? (
        <ReplyInput onSubmit={NOOP} />
      ) : (
        <CommentInput boardId="gate-board" onSubmit={NOOP} />
      )}
    </div>
  );
}
