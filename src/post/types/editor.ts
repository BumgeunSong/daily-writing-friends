export interface PostTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface VideoDialogState {
  isOpen: boolean;
  url: string;
}

export interface EditorDialogHandlers {
  onImageDialogOpen: () => void;
  onVideoDialogOpen: () => void;
  onVideoDialogClose: () => void;
  onVideoInsert: (url: string) => void;
}

// Re-export commonly used types for convenience
export type { QuillRef } from '../hooks/useQuillConfig';