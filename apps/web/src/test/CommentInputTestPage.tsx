import { useEffect, useRef, useState } from 'react';

import { MentionableInput } from '@/comment/components/MentionableInput';
import type { ProseMirrorDoc } from '@/shared/model/ProseMirror';

export default function CommentInputTestPage() {
  const [submitCount, setSubmitCount] = useState(0);
  const [submittedHtml, setSubmittedHtml] = useState('');
  const [submittedJson, setSubmittedJson] = useState<ProseMirrorDoc | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const stampTestIds = () => {
      const editable = container.querySelector('[contenteditable="true"]');
      if (editable && editable.getAttribute('data-testid') !== 'comment-editor-area') {
        editable.setAttribute('data-testid', 'comment-editor-area');
      }
    };

    stampTestIds();

    const observer = new MutationObserver(() => stampTestIds());
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['contenteditable'],
    });

    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (content: string, contentJson: ProseMirrorDoc) => {
    setSubmittedHtml(content);
    setSubmittedJson(contentJson);
    setSubmitCount((currentCount) => currentCount + 1);
  };

  return (
    <div data-testid='comment-input-test-page'>
      <div ref={containerRef} data-testid='comment-input-container'>
        <MentionableInput
          boardId=''
          placeholder='테스트 댓글 입력...'
          onSubmit={handleSubmit}
        />
      </div>

      <div data-testid='submit-count' style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        {submitCount}
      </div>
      <div
        data-testid='submitted-comment-output'
        style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
        dangerouslySetInnerHTML={{ __html: submittedHtml }}
      />
      <pre
        data-testid='submitted-comment-json'
        style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
      >
        {JSON.stringify(submittedJson)}
      </pre>
    </div>
  );
}
