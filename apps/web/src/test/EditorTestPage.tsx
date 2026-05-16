import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PostEditor } from '@/post/components/PostEditor';

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
      const editable = container.querySelector('[contenteditable="true"]');
      if (editable && editable.getAttribute('data-testid') !== 'editor-area') {
        editable.setAttribute('data-testid', 'editor-area');
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
