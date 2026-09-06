import Mention from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import type { MutableRefObject } from 'react';

import { filterAndRankCandidates } from '@/user/hooks/useMentionCandidates';
import type { User } from '@/user/model/User';

import { MentionList, type MentionListHandle } from '@/comment/components/MentionList';

const MENTION_LIMIT = 8;

/**
 * Refs (not render-time values) so the suggestion callbacks -- owned by
 * Tiptap's plugin, not React -- always read the latest candidates without
 * needing the extension to be reconfigured on every render.
 */
export function createMentionExtension(
  membersRef: MutableRefObject<User[]>,
  participantsRef: MutableRefObject<Set<string>>,
) {
  return Mention.configure({
    HTMLAttributes: { class: 'rounded bg-primary/10 px-1 text-primary' },
    renderHTML({ options, node }) {
      return [
        'span',
        { ...options.HTMLAttributes, 'data-mention': '', 'data-user-id': node.attrs.id },
        `@${node.attrs.label ?? node.attrs.id}`,
      ];
    },
    suggestion: {
      char: '@',
      items: ({ query }) =>
        filterAndRankCandidates(membersRef.current, query, participantsRef.current).slice(
          0,
          MENTION_LIMIT,
        ),
      render: () => {
        let component: ReactRenderer<MentionListHandle> | null = null;
        let unmount: (() => void) | undefined;
        return {
          onStart: (props) => {
            component = new ReactRenderer(MentionList, { props, editor: props.editor });
            unmount = props.mount?.(component.element as HTMLElement);
          },
          onUpdate: (props) => component?.updateProps(props),
          onKeyDown: (props) => {
            if (props.event.key === 'Escape') {
              component?.destroy();
              return true;
            }
            return component?.ref?.onKeyDown(props) ?? false;
          },
          onExit: () => {
            unmount?.();
            component?.destroy();
          },
        };
      },
    },
  });
}
