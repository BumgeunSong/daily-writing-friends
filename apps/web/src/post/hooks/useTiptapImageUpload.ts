import * as Sentry from '@sentry/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { storage } from '@/firebase';
import { processImageForUpload } from '@/post/utils/ImageUtils';
import { formatDate } from '@/post/utils/sanitizeHtml';
import type { Editor } from '@tiptap/react';

interface UseTiptapImageUploadProps {
  editor: Editor | null;
}

export function useTiptapImageUpload({ editor }: UseTiptapImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Upload a file to Firebase Storage
   * Returns the download URL or throws an error
   */
  const uploadFile = useCallback(async (file: File): Promise<string> => {
    // File size check (5MB) - check original file before processing
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size exceeds 5MB limit');
    }

    // File type check (allow HEIC by extension since some browsers don't set MIME type)
    const isHeicByExtension = /\.(heic|heif)$/i.test(file.name);
    if (!file.type.startsWith('image/') && !isHeicByExtension) {
      throw new Error('Only image files are allowed');
    }

    // Process image (HEIC conversion + resize)
    const processedFile = await processImageForUpload(file);

    // Generate storage path
    const now = new Date();
    const { dateFolder, timePrefix } = formatDate(now);
    const fileName = `${timePrefix}_${processedFile.name}`;
    const storageRef = ref(storage, `postImages/${dateFolder}/${fileName}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, processedFile);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  }, []);

  /**
   * Open file picker and handle image upload
   */
  const openFilePicker = useCallback(async () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        setIsUploading(true);
        setUploadProgress(0);

        // Simulate progress updates
        setUploadProgress(20);
        
        const downloadURL = await uploadFile(file);
        
        setUploadProgress(70);

        // Insert image into editor
        if (editor) {
          editor
            .chain()
            .focus()
            .setImage({ src: downloadURL, alt: file.name })
            .run();
        }

        setUploadProgress(100);
        toast.success('이미지가 업로드되었습니다.', {
          position: 'bottom-center',
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.';
        
        Sentry.captureException(error, {
          tags: { feature: 'image_upload', operation: 'upload_process' },
          extra: { fileName: file?.name, fileSize: file?.size, fileType: file?.type }
        });
        
        toast.error(errorMessage, {
          position: 'bottom-center',
        });
      } finally {
        // Reset loading state with slight delay for UX
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      }
    };
  }, [editor, uploadFile]);

  /**
   * Handle paste event for image upload
   * Can be used directly in TipTap's paste handler
   */
  const handlePaste = useCallback(async (event: ClipboardEvent): Promise<boolean> => {
    const items = event.clipboardData?.items;
    if (!items) return false;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        
        const file = item.getAsFile();
        if (!file) continue;

        try {
          setIsUploading(true);
          setUploadProgress(0);

          // Simulate progress
          setUploadProgress(20);
          
          const downloadURL = await uploadFile(file);
          
          setUploadProgress(70);

          // Insert image into editor
          if (editor) {
            editor
              .chain()
              .focus()
              .setImage({ src: downloadURL, alt: 'Pasted image' })
              .run();
          }

          setUploadProgress(100);
          toast.success('이미지가 업로드되었습니다.', {
            position: 'bottom-center',
          });

          return true; // Handled the paste

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.';
          
          Sentry.captureException(error, {
            tags: { feature: 'image_upload', operation: 'paste_upload' },
            extra: { fileSize: file?.size, fileType: file?.type }
          });
          
          toast.error(errorMessage, {
            position: 'bottom-center',
          });
        } finally {
          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(0);
          }, 500);
        }
      }
    }

    return false; // Not handled
  }, [editor, uploadFile]);

  return {
    openFilePicker,
    uploadFile,
    handlePaste,
    isUploading,
    uploadProgress,
  };
}