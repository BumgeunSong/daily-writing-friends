// Re-exports the canonical implementation from the root app's src/ to avoid duplication.
// A relative path is used intentionally: path aliases like @post/ resolve to apps/web/src/post/
// and cannot reference the root src/ directory.
export {
  convertUrlsToLinks,
  convertQuotesToBlockquotes,
  getContentPreview,
  sanitizePostContent,
  sanitizeCommentContent,
  convertHtmlToText,
} from '../../../../../src/post/utils/contentUtils';
