/**
 * ProseMirror document structure for the TipTap editor, based on the
 * ProseMirror JSON schema.
 *
 * This is an externally-owned contract (defined by ProseMirror/TipTap), not a
 * post- or comment-specific shape. It lives in a feature-neutral home so any
 * feature persisting editor content (posts, comments, replies) shares one
 * definition. See {@link parseContentJson} for the boundary parser.
 */
export interface ProseMirrorDoc {
  type: 'doc';
  content?: ProseMirrorNode[];
}

export interface ProseMirrorNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ProseMirrorNode[];
  marks?: ProseMirrorMark[];
  text?: string;
}

export interface ProseMirrorMark {
  type: string;
  attrs?: Record<string, unknown>;
}
