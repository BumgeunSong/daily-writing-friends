export interface UploadProgress {
  current: number;
  total: number;
  percentage: number;
  currentFileName: string;
}

export interface UploadResult {
  success: number;
  failed: number;
  failedFiles: Array<{ name: string; error: string }>;
}

export interface MaxFilesAlert {
  show: boolean;
  fileCount: number;
}

export interface ImageUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFiles: () => void;
  onClose: () => void;
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  uploadComplete: UploadResult | null;
  maxFilesAlert: MaxFilesAlert;
  onMaxFilesConfirm: () => void;
  onMaxFilesCancel: () => void;
}

export type DialogState = 'initial' | 'uploading' | 'complete' | 'maxFiles';