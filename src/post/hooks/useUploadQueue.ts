import { useReducer, useCallback } from 'react';
import { ProcessedFile } from './useFileProcessor';
import { UploadResult, UploadError } from '../api/imageUpload';

export interface UploadProgress {
  current: number;
  total: number;
  percentage: number;
  currentFileName: string;
}

export interface UploadComplete {
  success: number;
  failed: number;
  failedFiles: Array<{ name: string; error: string }>;
}

export type UploadState =
  | { type: 'idle' }
  | { type: 'uploading'; progress: UploadProgress }
  | { type: 'complete'; results: UploadComplete };

export type UploadAction =
  | { type: 'start'; files: ProcessedFile[] }
  | { type: 'progress'; current: number; fileName: string }
  | { type: 'complete'; successes: UploadResult[]; errors: UploadError[] }
  | { type: 'reset' };

const uploadReducer = (state: UploadState, action: UploadAction): UploadState => {
  switch (action.type) {
    case 'start':
      return {
        type: 'uploading',
        progress: {
          current: 0,
          total: action.files.length,
          percentage: 0,
          currentFileName: '',
        },
      };

    case 'progress': {
      if (state.type !== 'uploading') return state;

      const percentage = Math.round((action.current / state.progress.total) * 100);

      return {
        type: 'uploading',
        progress: {
          ...state.progress,
          current: action.current,
          percentage,
          currentFileName: action.fileName,
        },
      };
    }

    case 'complete':
      return {
        type: 'complete',
        results: {
          success: action.successes.length,
          failed: action.errors.length,
          failedFiles: action.errors.map(error => ({
            name: error.fileName,
            error: error.error,
          })),
        },
      };

    case 'reset':
      return { type: 'idle' };

    default:
      return state;
  }
};

export function useUploadQueue() {
  const [state, dispatch] = useReducer(uploadReducer, { type: 'idle' });

  const startUpload = useCallback((files: ProcessedFile[]) => {
    dispatch({ type: 'start', files });
  }, []);

  const updateProgress = useCallback((current: number, fileName: string) => {
    dispatch({ type: 'progress', current, fileName });
  }, []);

  const completeUpload = useCallback((successes: UploadResult[], errors: UploadError[]) => {
    dispatch({ type: 'complete', successes, errors });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
  }, []);

  return {
    state,
    startUpload,
    updateProgress,
    completeUpload,
    reset,
  };
}