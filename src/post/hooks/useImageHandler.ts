import * as Sentry from '@sentry/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import heic2any from 'heic2any';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { storage } from '@/firebase';
import type { ImageHandler, ImageUploadResult } from '../types/nativeEditor';

interface UseImageHandlerProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  content: string;
  onContentChange: (content: string) => void;
}

export function useImageHandler({
  textareaRef,
  content,
  onContentChange,
}: UseImageHandlerProps): ImageHandler {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(new Map<string, number>());

  const insertImagePlaceholder = useCallback((filename: string, uploadId: string): number => {
    const textarea = textareaRef.current;
    if (!textarea) return 0;

    const cursorPos = textarea.selectionStart;
    const placeholder = `\n![Uploading ${filename}...](uploading-${uploadId})\n`;
    
    const newContent = content.substring(0, cursorPos) + 
                      placeholder + 
                      content.substring(cursorPos);
    
    onContentChange(newContent);
    
    // Position cursor after placeholder
    setTimeout(() => {
      const newPos = cursorPos + placeholder.length;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    }, 0);

    return cursorPos;
  }, [textareaRef, content, onContentChange]);

  const replacePlaceholder = useCallback((uploadId: string, imageUrl: string, filename: string) => {
    const placeholderPattern = `![Uploading ${filename}...](uploading-${uploadId})`;
    const imageMarkdown = `![${filename}](${imageUrl})`;
    
    const newContent = content.replace(placeholderPattern, imageMarkdown);
    onContentChange(newContent);
  }, [content, onContentChange]);

  const removeFailedPlaceholder = useCallback((uploadId: string, filename: string) => {
    const placeholderPattern = `\n![Uploading ${filename}...](uploading-${uploadId})\n`;
    const newContent = content.replace(placeholderPattern, '');
    onContentChange(newContent);
  }, [content, onContentChange]);

  const uploadSingleImage = useCallback(async (file: File): Promise<ImageUploadResult> => {
    const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let processedFile = file;

    try {
      // Insert placeholder immediately
      insertImagePlaceholder(file.name, uploadId);
      setIsUploading(true);

      // Update progress for this upload
      setUploadProgress(prev => new Map(prev).set(uploadId, 0));

      // File size check (5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("파일 크기는 5MB를 초과할 수 없습니다.");
      }

      // HEIC file conversion
      if (file.type === 'image/heic' || 
          file.type === 'image/heif' || 
          file.name.toLowerCase().endsWith('.heic') || 
          file.name.toLowerCase().endsWith('.heif')) {
        
        setUploadProgress(prev => new Map(prev).set(uploadId, 10));
        
        try {
          const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.8
          }) as Blob;
          
          const convertedFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
          processedFile = new File([convertedBlob], convertedFileName, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
        } catch (conversionError) {
          Sentry.captureException(conversionError, {
            tags: { feature: 'native_editor_image_upload', operation: 'heic_conversion' },
            extra: { fileName: file.name, fileSize: file.size, fileType: file.type }
          });
          throw new Error("HEIC 파일 변환에 실패했습니다.");
        }
      }

      // File type check
      if (!processedFile.type.startsWith('image/')) {
        throw new Error("이미지 파일만 업로드할 수 있습니다.");
      }

      setUploadProgress(prev => new Map(prev).set(uploadId, 20));

      // Create file path with date
      const now = new Date();
      const { dateFolder, timePrefix } = formatDate(now);
      const fileName = `${timePrefix}_${processedFile.name}`;
      const storageRef = ref(storage, `postImages/${dateFolder}/${fileName}`);

      // Upload file
      setUploadProgress(prev => new Map(prev).set(uploadId, 40));
      const snapshot = await uploadBytes(storageRef, processedFile);
      setUploadProgress(prev => new Map(prev).set(uploadId, 70));

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      setUploadProgress(prev => new Map(prev).set(uploadId, 90));

      // Replace placeholder with actual image
      replacePlaceholder(uploadId, downloadURL, processedFile.name);

      setUploadProgress(prev => new Map(prev).set(uploadId, 100));
      
      toast.success("이미지가 업로드되었습니다.", {
        position: 'bottom-center',
      });

      return {
        url: downloadURL,
        filename: processedFile.name,
        size: processedFile.size,
      };

    } catch (error) {
      // Remove failed placeholder
      removeFailedPlaceholder(uploadId, file.name);
      
      const errorMessage = error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.";
      
      Sentry.captureException(error, {
        tags: { feature: 'native_editor_image_upload', operation: 'upload_process' },
        extra: { fileName: processedFile?.name, fileSize: processedFile?.size, fileType: processedFile?.type }
      });
      
      toast.error(errorMessage, {
        position: 'bottom-center',
      });

      throw error;
    } finally {
      // Clean up progress tracking
      setTimeout(() => {
        setUploadProgress(prev => {
          const newMap = new Map(prev);
          newMap.delete(uploadId);
          return newMap;
        });
        
        // Check if no more uploads in progress
        if (uploadProgress.size <= 1) {
          setIsUploading(false);
        }
      }, 500);
    }
  }, [
    insertImagePlaceholder, 
    replacePlaceholder, 
    removeFailedPlaceholder, 
    uploadProgress.size
  ]);

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find(item => item.type.startsWith('image/'));

    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        try {
          await uploadSingleImage(file);
        } catch (error) {
          // Error already handled in uploadSingleImage
        }
      }
    }
  }, [uploadSingleImage]);

  const handleDrop = useCallback(async (e: DragEvent) => {
    const files = Array.from(e.dataTransfer?.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      e.preventDefault();
      
      // Upload multiple images sequentially
      for (const file of imageFiles) {
        try {
          await uploadSingleImage(file);
        } catch (error) {
          // Error already handled in uploadSingleImage
          // Continue with next file
        }
      }
    }
  }, [uploadSingleImage]);

  const handleFileSelect = useCallback(async (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

    // Upload multiple images sequentially
    for (const file of imageFiles) {
      try {
        await uploadSingleImage(file);
      } catch (error) {
        // Error already handled in uploadSingleImage
        // Continue with next file
      }
    }
  }, [uploadSingleImage]);

  return {
    handlePaste,
    handleDrop,
    handleFileSelect,
    uploadProgress,
    isUploading,
  };
}

// Reuse the same date formatting function from useImageUpload
const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return {
    dateFolder: `${year}${month}${day}`,
    timePrefix: `${hours}${minutes}${seconds}`
  };
};