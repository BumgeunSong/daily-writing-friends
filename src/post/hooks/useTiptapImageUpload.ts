import * as Sentry from '@sentry/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import heic2any from 'heic2any';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Editor } from '@tiptap/react';
import { storage } from '@/firebase';
import { formatDate } from '@/post/utils/sanitizeHtml';

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
    let processedFile = file;

    // File size check (5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size exceeds 5MB limit');
    }

    // HEIC file conversion
    if (
      file.type === 'image/heic' || 
      file.type === 'image/heif' || 
      file.name.toLowerCase().endsWith('.heic') || 
      file.name.toLowerCase().endsWith('.heif')
    ) {
      try {
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8
        }) as Blob;
        
        // Convert blob to file with proper name
        const convertedFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
        processedFile = new File([convertedBlob], convertedFileName, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
      } catch (conversionError) {
        Sentry.captureException(conversionError, {
          tags: { feature: 'image_upload', operation: 'heic_conversion' },
          extra: { fileName: file.name, fileSize: file.size, fileType: file.type }
        });
        throw new Error('Failed to convert HEIC file');
      }
    }

    // File type check (after conversion)
    if (!processedFile.type.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }

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