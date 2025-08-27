export interface TextSelection {
  start: number;
  end: number;
  text: string;
  isEmpty: boolean;
}

export interface FormatState {
  isBold: boolean;
  isItalic: boolean;
  isStrike: boolean;
  isHeading1: boolean;
  isHeading2: boolean;
  isBlockquote: boolean;
  isBulletList: boolean;
  isOrderedList: boolean;
  isLink: boolean;
}

export interface TextFormatter {
  // Format detection
  isBold(): boolean;
  isItalic(): boolean;
  isStrike(): boolean;
  isHeading(level?: 1 | 2): boolean;
  isBulletList(): boolean;
  isOrderedList(): boolean;
  isBlockquote(): boolean;
  isLink(): boolean;
  
  // Format actions  
  toggleBold(): void;
  toggleItalic(): void;
  toggleStrike(): void;
  toggleHeading(level: 1 | 2): void;
  toggleBulletList(): void;
  toggleOrderedList(): void;
  toggleBlockquote(): void;
  insertLink(url: string): void;
  
  // Format state
  getFormatState(): FormatState;
}

export interface NativeEditorState {
  content: string;
  isComposing: boolean;
  selection: TextSelection;
  formatState: FormatState;
  isUploading: boolean;
  uploadProgress: Map<string, number>;
}

export interface NativeTextEditorProps {
  initialContent?: string;
  onSave?: (content: string) => void;
  onImageUpload?: () => void;
  variant?: 'sticky' | 'inline';
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export interface ImageUploadResult {
  url: string;
  filename: string;
  size: number;
}

export interface ImageHandler {
  handlePaste: (e: ClipboardEvent) => Promise<void>;
  handleDrop: (e: DragEvent) => Promise<void>;  
  handleFileSelect: (files: FileList) => Promise<void>;
  uploadProgress: Map<string, number>;
  isUploading: boolean;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
}

export interface MarkdownPattern {
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
}

export type EditorVariant = 'sticky' | 'inline';