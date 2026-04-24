import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PostEditor } from '@/post/components/PostEditor';

// QUILL-SPECIFIC: Only used when Quill is forced via forceEditor="quill"
const QUILL_TOOLBAR_MAPPINGS: Record<string, string> = {
  'toolbar-bold': '.ql-bold',
  'toolbar-italic': '.ql-italic',
  'toolbar-underline': '.ql-underline',
  'toolbar-strike': '.ql-strike',
  'toolbar-h1': '.ql-header[value="1"]',
  'toolbar-h2': '.ql-header[value="2"]',
  'toolbar-blockquote': '.ql-blockquote',
  'toolbar-ordered-list': '.ql-list[value="ordered"]',
  'toolbar-bullet-list': '.ql-list[value="bullet"]',
  'toolbar-link': '.ql-link',
  'toolbar-image': '.ql-image',
};

export default function EditorTestPage() {
  const [searchParams] = useSearchParams();
  const fixtureName = searchParams.get('fixture');

  const [initialContent] = useState<string>(() => {
    if (!fixtureName) return '';
    const win = window as unknown as { __TEST_FIXTURES__?: Record<string, string> };
    return win.__TEST_FIXTURES__?.[fixtureName] ?? '';
  });

  const [content, setContent] = useState<string>(initialContent);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const stampTestIds = () => {
      // Always stamp contenteditable as editor-area
      const editable = container.querySelector('[contenteditable="true"]');
      if (editable && editable.getAttribute('data-testid') !== 'editor-area') {
        editable.setAttribute('data-testid', 'editor-area');
      }

      // Tiptap buttons already have data-testid — skip Quill stamping
      const tiptapButton = container.querySelector('[data-testid="toolbar-bold"]');
      if (tiptapButton) return;

      // Quill fallback
      for (const [testId, selector] of Object.entries(QUILL_TOOLBAR_MAPPINGS)) {
        const btn = container.querySelector(selector);
        if (btn && btn.getAttribute('data-testid') !== testId) {
          btn.setAttribute('data-testid', testId);
        }
      }
    };

    stampTestIds();

    const observer = new MutationObserver(() => stampTestIds());
    observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['contenteditable'] });

    const interval = setInterval(stampTestIds, 100);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return (
    <div data-testid="editor-test-page">
      <div ref={containerRef} data-testid="editor-container">
        <PostEditor
          value={content}
          onChange={setContent}
          placeholder="테스트 에디터..."
          forceEditor="tiptap"
        />
      </div>

      {/* Hidden output panel for E2E assertions — dev-only route, content is DOMPurify-sanitized */}
      <div
        data-testid="editor-output"
        style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
