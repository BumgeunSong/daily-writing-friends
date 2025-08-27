import type Quill from 'quill';

export interface QuillToolbarButtonConfig {
  icon?: string;
  label?: string;
  handler?: () => void;
}

export interface QuillToolbarConfig {
  container: Array<Array<string | { [key: string]: any }>>;
  handlers?: {
    [key: string]: () => void;
  };
}

export interface QuillModulesConfig {
  toolbar: QuillToolbarConfig;
  clipboard?: {
    matchVisual: boolean;
  };
}

export interface EnhancedQuillProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  stickyToolbar?: boolean;
  onImagePaste?: (file: File) => Promise<void>;
  onImageUpload?: (file: File) => Promise<string>;
}

export interface StickyToolbarProps {
  quillRef: React.RefObject<any>;
  isUploading?: boolean;
  uploadProgress?: number;
  onImageUpload?: () => void;
}

export interface PasteHandlerOptions {
  onImagePaste: (file: File) => Promise<void>;
  quillRef: React.RefObject<any>;
}

// Quill instance type with proper typing
export interface QuillInstance extends Quill {
  getEditor(): Quill;
}

export type QuillFormat = 
  | 'bold' 
  | 'italic' 
  | 'underline' 
  | 'strike'
  | 'blockquote' 
  | 'header'
  | 'list' 
  | 'link' 
  | 'image';

export interface ToolbarButtonState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  blockquote: boolean;
  header: number | false;
  list: 'ordered' | 'bullet' | false;
}