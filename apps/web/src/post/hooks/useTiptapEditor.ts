import Dropcursor from '@tiptap/extension-dropcursor';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useRef, useEffect } from 'react';
import type { ProseMirrorDoc } from '@/post/model/Post';
import { shouldSyncEditorContent } from '@/post/utils/editorContentSync';
import { sanitize } from '@/post/utils/sanitizeHtml';

// Editor configuration constants
const DEFAULT_DEBOUNCE_DELAY = 300; // milliseconds
const DEFAULT_PLACEHOLDER = '내용을 입력하세요...';

interface UseTiptapEditorProps {
  initialHtml?: string;
  initialJson?: ProseMirrorDoc;
  onChange: (output: { html: string; json: ProseMirrorDoc }) => void;
  placeholder?: string;
  debounceDelay?: number;
}

/**
 * Custom hook for TipTap editor configuration and initialization
 * Encapsulates all editor setup logic including extensions and event handlers
 */
export function useTiptapEditor({
  initialHtml,
  initialJson,
  onChange,
  placeholder = DEFAULT_PLACEHOLDER,
  debounceDelay = DEFAULT_DEBOUNCE_DELAY,
}: UseTiptapEditorProps) {
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Configure TipTap extensions
  const extensions = [
    StarterKit.configure({
      codeBlock: false,
      code: false,
      horizontalRule: false,
      dropcursor: false,
      heading: {
        levels: [1, 2],
      },
    }),
    Underline,
    Link.configure({
      openOnClick: true,
      autolink: true,
      defaultProtocol: 'https',
      protocols: ['http', 'https'],
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      validate: (href) => /^https?:\/\//.test(href),
    }),
    Image.configure({
      allowBase64: true,
      HTMLAttributes: {
        class: 'max-w-full h-auto rounded-lg',
      },
    }),
    Placeholder.configure({
      placeholder,
      emptyEditorClass: 'is-editor-empty',
    }),
    Dropcursor.configure({
      color: '#6B7280',
    }),
  ];

  // Initialize editor
  const editor = useEditor({
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    extensions,
    content: initialJson || initialHtml || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-lg max-w-none min-h-[300px] focus:outline-none px-0 py-6 dark:prose-invert prose-headings:text-foreground prose-strong:text-foreground prose-a:text-accent prose-blockquote:border-l-muted-foreground prose-blockquote:text-muted-foreground',
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            // Block ProseMirror's default paste — our addEventListener handler uploads instead
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // Debounce onChange calls for performance
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        const html = sanitize(editor.getHTML());
        const json = editor.getJSON();
        onChange({ html, json });
      }, debounceDelay);
    },
  });

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Tiptap's useEditor only seeds `content` once. When a draft loads after
  // mount, the editor would otherwise stay empty even though the prop changed.
  useEffect(() => {
    if (!editor) return;
    const sync = shouldSyncEditorContent({
      currentHtml: editor.getHTML(),
      targetHtml: initialHtml,
      isFocused: editor.isFocused,
    });
    if (!sync) return;
    editor.commands.setContent(initialJson || initialHtml || '', { emitUpdate: false });
  }, [editor, initialHtml, initialJson]);

  return editor;
}
