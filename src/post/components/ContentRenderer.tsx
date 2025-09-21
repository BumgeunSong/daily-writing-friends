import React from 'react';
import { sanitizePostContent } from '../utils/contentUtils';
import { ContentBlock } from '../utils/contentParser';
import { VideoPlayer } from './VideoPlayer';

interface ContentRendererProps {
  blocks: ContentBlock[];
  className?: string;
  style?: React.CSSProperties;
}

/**
 * React component that renders parsed content blocks
 * Handles both HTML content and video embeds as proper React components
 */
export function ContentRenderer({ blocks, className = '', style }: ContentRendererProps) {
  if (!blocks || blocks.length === 0) {
    return <p>내용이 없습니다.</p>;
  }

  return (
    <div className={className} style={style}>
      {blocks.map((block, index) => (
        <ContentBlockRenderer key={index} block={block} />
      ))}
    </div>
  );
}

interface ContentBlockProps {
  block: ContentBlock;
}

function ContentBlockRenderer({ block }: ContentBlockProps) {
  if (block.type === 'html') {
    // Process HTML content with sanitization and bullet list fixes
    const processedContent = sanitizePostContent(block.content);

    return (
      <div
        dangerouslySetInnerHTML={{ __html: processedContent }}
        className="prose-content"
      />
    );
  }

  if (block.type === 'video') {
    return (
      <div className="video-embed-container my-4">
        <VideoPlayer
          {...block.data}
          lazy={true}
          controls={true}
          className="rounded-lg overflow-hidden"
        />
      </div>
    );
  }

  return null;
}

// CSS styles for the content renderer
const contentRendererStyles = `
.prose-content {
  /* Inherit prose styles from parent */
}

.prose-content p {
  margin-bottom: 0.5rem;
}

.prose-content p:last-child {
  margin-bottom: 0;
}

.prose-content strong {
  font-weight: 600;
}

.prose-content a {
  color: hsl(var(--primary));
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.prose-content a:hover {
  color: hsl(var(--primary) / 0.8);
}

.prose-content h1 {
  font-size: 1.875rem;
  font-weight: 600;
  margin-top: 2.5rem;
  margin-bottom: 1.5rem;
}

.prose-content h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 1.25rem;
}

.prose-content blockquote {
  border-left: 4px solid hsl(var(--border));
  padding-left: 1rem;
  margin: 1rem 0;
  font-style: italic;
  color: hsl(var(--muted-foreground));
}

.prose-content ul,
.prose-content ol {
  padding-left: 1.5rem;
  margin: 1rem 0;
}

.prose-content li {
  margin-bottom: 0.25rem;
}

.video-embed-container {
  /* Ensure proper spacing around video embeds */
  clear: both;
}

/* Responsive video sizing */
@media (max-width: 768px) {
  .video-embed-container {
    margin: 1rem -1rem; /* Extend to screen edges on mobile */
  }
}
`;

// Inject styles into document head
if (typeof document !== 'undefined' && !document.querySelector('#content-renderer-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'content-renderer-styles';
  styleSheet.textContent = contentRendererStyles;
  document.head.appendChild(styleSheet);
}