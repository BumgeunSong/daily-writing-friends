import Dropcursor from '@tiptap/extension-dropcursor';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useEffect, useRef } from 'react';
import type { ProseMirrorDoc } from '@/post/model/Post';
import { decideEditorContentSync } from '@/post/utils/editorContentSync';
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

  // Tiptap's useEditor only seeds `content` once. Refs keep the freshest
  // target/onChange visible to the blur handler without re-binding it.
  const initialHtmlRef = useRef(initialHtml);
  const initialJsonRef = useRef(initialJson);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    initialHtmlRef.current = initialHtml;
    initialJsonRef.current = initialJson;
    onChangeRef.current = onChange;
  }, [initialHtml, initialJson, onChange]);

  // Tracks the target signature we last reconciled with the editor. Lets the
  // decision skip blur events that fire mid-debounce, so user keystrokes are
  // not overwritten by lagging parent state.
  const lastSyncedSignatureRef = useRef<string | null>(null);

  const trySyncContent = useCallback(() => {
    if (!editor) return;
    const targetHtml = initialHtmlRef.current;
    const targetJson = initialJsonRef.current;
    const action = decideEditorContentSync({
      // Sanitize before comparing — parent state holds sanitized HTML, while
      // editor.getHTML() carries extension-rendered classes (e.g. Image).
      currentSanitizedHtml: sanitize(editor.getHTML()),
      currentJsonStr: JSON.stringify(editor.getJSON()),
      targetHtml,
      targetJsonStr: targetJson === undefined ? undefined : JSON.stringify(targetJson),
      isFocused: editor.isFocused,
      lastSyncedSignature: lastSyncedSignatureRef.current,
    });
    if (action.kind === 'skip') return;
    if (action.kind === 'recordOnly') {
      lastSyncedSignatureRef.current = action.signature;
      return;
    }
    editor.commands.setContent(targetJson ?? targetHtml ?? '', { emitUpdate: false });
    lastSyncedSignatureRef.current = action.signature;
    // emitUpdate:false suppresses Tiptap's onUpdate, which is what feeds the
    // parent's contentJson. Mirror it ourselves so HTML and JSON stay paired.
    onChangeRef.current({
      html: sanitize(editor.getHTML()),
      json: editor.getJSON(),
    });
  }, [editor]);

  useEffect(() => {
    trySyncContent();
  }, [trySyncContent, initialHtml, initialJson]);

  // Retry on blur so a target that arrived while the user was focused — e.g.
  // they tapped the empty editor before the draft fetch resolved — still lands.
  useEffect(() => {
    if (!editor) return;
    editor.on('blur', trySyncContent);
    return () => {
      editor.off('blur', trySyncContent);
    };
  }, [editor, trySyncContent]);

  return editor;
}
