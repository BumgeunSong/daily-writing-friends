import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PostEditor } from '@/post/components/PostEditor';

// Toolbar button mapping: data-testid -> editor toolbar query selector
const TOOLBAR_MAPPINGS: Record<string, string> = {
  'toolbar-bold': '.ql-bold, button[data-testid="toolbar-bold"]',
  'toolbar-italic': '.ql-italic, button[data-testid="toolbar-italic"]',
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

function ToolbarProxy({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const handleClick = useCallback((testId: string) => {
    const container = containerRef.current;
    if (!container) return;

    const selector = TOOLBAR_MAPPINGS[testId];
    if (!selector) return;

    const button = container.querySelector(selector) as HTMLButtonElement;
    if (button) {
      button.click();
    }
  }, [containerRef]);

  return (
    <div data-testid="toolbar-proxy" style={{ display: 'none' }}>
      {Object.keys(TOOLBAR_MAPPINGS).map((testId) => (
        <button
          key={testId}
          data-testid={testId}
          onClick={() => handleClick(testId)}
          type="button"
        />
      ))}
    </div>
  );
}

export default function EditorTestPage() {
  const [searchParams] = useSearchParams();
  const fixtureName = searchParams.get('fixture');

  // Load fixture content if specified
  const [initialContent] = useState<string>(() => {
    if (!fixtureName) return '';
    // Fixtures are injected via window for test setup
    const win = window as unknown as { __TEST_FIXTURES__?: Record<string, string> };
    return win.__TEST_FIXTURES__?.[fixtureName] ?? '';
  });

  const [content, setContent] = useState<string>(initialContent);
  const containerRef = useRef<HTMLDivElement>(null);

  // Set data-testid="editor-area" on the contenteditable element
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      const editable = container.querySelector('[contenteditable="true"]');
      if (editable && !editable.hasAttribute('data-testid')) {
        editable.setAttribute('data-testid', 'editor-area');
      }
    });

    // Initial check
    const editable = container.querySelector('[contenteditable="true"]');
    if (editable) {
      editable.setAttribute('data-testid', 'editor-area');
    }

    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div data-testid="editor-test-page">
      <ToolbarProxy containerRef={containerRef} />

      <div ref={containerRef} data-testid="editor-container">
        <PostEditor
          value={content}
          onChange={setContent}
          placeholder="테스트 에디터..."
        />
      </div>

      {/* Hidden output panel for E2E assertions */}
      <div
        data-testid="editor-output"
        style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
