import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Dropcursor from '@tiptap/extension-dropcursor';
import { useRef, useEffect } from 'react';
import { sanitize } from '@/post/utils/sanitizeHtml';
import { ProseMirrorDoc } from '@/post/model/Post';
import { imeLogger } from '@/post/utils/imeLogger';

// Editor configuration constants
const DEFAULT_DEBOUNCE_DELAY = 300; // milliseconds
const DEFAULT_PLACEHOLDER = '내용을 입력하세요...';
const ENABLE_IME_DIAGNOSTICS = true; // Toggle for IME debugging

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
    extensions,
    content: initialJson || initialHtml || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-lg max-w-none min-h-[300px] focus:outline-none px-0 py-6 dark:prose-invert prose-headings:text-foreground prose-strong:text-foreground prose-a:text-accent prose-blockquote:border-l-muted-foreground prose-blockquote:text-muted-foreground',
      },
      handlePaste: (view, event) => {
        // Check if clipboard contains image
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            // Will be handled by our custom paste handler
            return false;
          }
        }
        return false; // Let TipTap handle other paste events
      },
      handleDOMEvents: ENABLE_IME_DIAGNOSTICS ? {
        compositionstart: (view, event) => {
          const state = {
            selection: { from: view.state.selection.from, to: view.state.selection.to },
            content: view.state.doc.textContent.substring(
              Math.max(0, view.state.selection.from - 50),
              Math.min(view.state.doc.textContent.length, view.state.selection.to + 50)
            ),
          };
          imeLogger.logCompositionStart(event as CompositionEvent, state);
          
          console.log('%c[Tiptap] compositionstart handled', 'color: #9333EA', {
            selectionFrom: view.state.selection.from,
            selectionTo: view.state.selection.to,
            data: (event as CompositionEvent).data,
          });
          return false; // Let ProseMirror handle it
        },
        compositionupdate: (view, event) => {
          const state = {
            selection: { from: view.state.selection.from, to: view.state.selection.to },
            content: view.state.doc.textContent.substring(
              Math.max(0, view.state.selection.from - 50),
              Math.min(view.state.doc.textContent.length, view.state.selection.to + 50)
            ),
          };
          imeLogger.logCompositionUpdate(event as CompositionEvent, state);
          
          console.log('%c[Tiptap] compositionupdate handled', 'color: #9333EA', {
            data: (event as CompositionEvent).data,
            currentContent: view.state.doc.textContent.substring(
              view.state.selection.from - 10,
              view.state.selection.from + 10
            ),
          });
          return false; // Let ProseMirror handle it
        },
        compositionend: (view, event) => {
          const state = {
            selection: { from: view.state.selection.from, to: view.state.selection.to },
            content: view.state.doc.textContent.substring(
              Math.max(0, view.state.selection.from - 50),
              Math.min(view.state.doc.textContent.length, view.state.selection.to + 50)
            ),
          };
          
          // Check actual inserted text after a brief delay
          setTimeout(() => {
            const afterContent = view.state.doc.textContent;
            const insertedText = afterContent.substring(
              view.state.selection.from - (event as CompositionEvent).data.length,
              view.state.selection.from
            );
            imeLogger.logCompositionEnd(event as CompositionEvent, state, insertedText);
            
            console.log('%c[Tiptap] compositionend result', 'color: #9333EA', {
              expected: (event as CompositionEvent).data,
              inserted: insertedText,
              match: insertedText === (event as CompositionEvent).data,
            });
          }, 10);
          
          return false; // Let ProseMirror handle it
        },
        beforeinput: (view, event) => {
          const inputEvent = event as InputEvent;
          if (inputEvent.isComposing) {
            console.log('%c[Tiptap] beforeinput during composition', 'color: #9333EA', {
              inputType: inputEvent.inputType,
              data: inputEvent.data,
            });
          }
          return false; // Let ProseMirror handle it
        },
      } : {},
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

  return editor;
}
