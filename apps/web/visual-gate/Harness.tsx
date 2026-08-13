import { useEffect } from 'react';

import { CommentInput } from '@/comment/components/CommentInput';
import { MentionableInput } from '@/comment/components/MentionableInput';
import ReplyInput from '@/comment/components/ReplyInput';

const NOOP = async () => {};

// Mounts one comment-input component under test, chosen by ?component=.
// Wrapped in a width box that stands in for the post-detail comment column.
export function Harness() {
  const which = new URLSearchParams(location.search).get('component') ?? 'commentInput';

  // The gate waits for data-vg-ready before capturing. Set it after the harness
  // has committed and fonts have settled; the rAF defers one frame past commit so
  // layout is final. With system fonts fonts.ready resolves immediately.
  useEffect(() => {
    let raf = 0;
    Promise.resolve(document.fonts?.ready).then(() => {
      raf = requestAnimationFrame(() => document.documentElement.setAttribute('data-vg-ready', ''));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

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
