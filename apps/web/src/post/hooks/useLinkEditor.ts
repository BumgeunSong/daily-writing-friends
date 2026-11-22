import type { Editor } from '@tiptap/react';
import { useState } from 'react';
import { isValidHttpUrl } from '@/post/utils/sanitizeHtml';

/**
 * Link set/unset state shared by every editor surface that edits links
 * (fixed toolbar, floating bubble menu). Validation follows isValidHttpUrl.
 */
export function useLinkEditor(editor: Editor) {
  const [linkUrl, setLinkUrl] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const close = () => {
    setLinkUrl('');
    setIsOpen(false);
  };

  const open = () => {
    setLinkUrl(editor.getAttributes('link').href || '');
    setIsOpen(true);
  };

  const apply = () => {
    if (!linkUrl) {
      editor.chain().focus().unsetLink().run();
    } else if (isValidHttpUrl(linkUrl)) {
      const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().setLink({ href: url }).run();
    }
    close();
  };

  const isInvalid = !!linkUrl && !isValidHttpUrl(linkUrl);
  const showProtocolHint = isInvalid && !linkUrl.startsWith('http');

  return { linkUrl, setLinkUrl, isOpen, setIsOpen, open, apply, cancel: close, isInvalid, showProtocolHint };
}
