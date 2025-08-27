import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { PasteHandlerOptions } from '../types/quillEditor';

export function useQuillPasteHandler({ 
  onImagePaste, 
  quillRef 
}: PasteHandlerOptions) {
  const isProcessingPaste = useRef(false);

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (isProcessingPaste.current) return;
    
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    // Check for image files first
    const files = Array.from(clipboardData.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      event.preventDefault();
      isProcessingPaste.current = true;

      try {
        // Handle multiple images
        for (const file of imageFiles) {
          await onImagePaste(file);
        }

        if (imageFiles.length > 1) {
          toast.success(`${imageFiles.length}개의 이미지가 업로드되었습니다.`, {
            position: 'bottom-center',
          });
        }
      } catch (error) {
        console.error('Image paste error:', error);
        toast.error('이미지 붙여넣기에 실패했습니다.', {
          position: 'bottom-center',
        });
      } finally {
        isProcessingPaste.current = false;
      }
      return;
    }

    // Check for image URLs in clipboard text
    const clipboardText = clipboardData.getData('text/plain');
    if (clipboardText) {
      const imageUrlPattern = /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
      const isImageUrl = imageUrlPattern.test(clipboardText.trim());
      
      if (isImageUrl) {
        event.preventDefault();
        isProcessingPaste.current = true;

        try {
          // Convert URL to blob and then to file
          const response = await fetch(clipboardText.trim());
          const blob = await response.blob();
          
          // Create a file from the blob
          const fileName = clipboardText.split('/').pop()?.split('?')[0] || 'pasted-image';
          const file = new File([blob], fileName, { type: blob.type });
          
          await onImagePaste(file);
          toast.success('이미지 URL이 업로드되었습니다.', {
            position: 'bottom-center',
          });
        } catch (error) {
          console.error('Image URL paste error:', error);
          // If URL fetch fails, let Quill handle it as regular text
          isProcessingPaste.current = false;
          return;
        } finally {
          isProcessingPaste.current = false;
        }
        return;
      }
    }

    // Check for HTML content with images
    const htmlData = clipboardData.getData('text/html');
    if (htmlData) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlData;
      const images = tempDiv.querySelectorAll('img');
      
      if (images.length > 0) {
        const imageUrls: string[] = [];
        images.forEach(img => {
          const src = img.getAttribute('src');
          if (src && (src.startsWith('http') || src.startsWith('data:'))) {
            imageUrls.push(src);
          }
        });

        if (imageUrls.length > 0) {
          event.preventDefault();
          isProcessingPaste.current = true;

          try {
            for (const imageUrl of imageUrls) {
              if (imageUrl.startsWith('data:')) {
                // Handle base64 images
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const file = new File([blob], 'pasted-image.png', { type: blob.type });
                await onImagePaste(file);
              } else {
                // Handle regular URLs
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const fileName = imageUrl.split('/').pop()?.split('?')[0] || 'pasted-image';
                const file = new File([blob], fileName, { type: blob.type });
                await onImagePaste(file);
              }
            }

            if (imageUrls.length > 1) {
              toast.success(`${imageUrls.length}개의 이미지가 업로드되었습니다.`, {
                position: 'bottom-center',
              });
            }
          } catch (error) {
            console.error('HTML image paste error:', error);
            // If processing fails, let Quill handle the original HTML
            isProcessingPaste.current = false;
            return;
          } finally {
            isProcessingPaste.current = false;
          }
          return;
        }
      }
    }

    // For all other content, let Quill handle it normally
  }, [onImagePaste]);

  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const editorElement = editor.root;
    
    // Add paste event listener to the editor
    editorElement.addEventListener('paste', handlePaste);

    return () => {
      editorElement.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste, quillRef]);

  return {
    isProcessingPaste: isProcessingPaste.current
  };
}

// Utility function to detect if content is an image URL
export function isImageUrl(text: string): boolean {
  const imageUrlPattern = /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
  return imageUrlPattern.test(text.trim());
}

// Utility function to extract image URLs from HTML
export function extractImageUrlsFromHtml(html: string): string[] {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const images = tempDiv.querySelectorAll('img');
  
  const urls: string[] = [];
  images.forEach(img => {
    const src = img.getAttribute('src');
    if (src && (src.startsWith('http') || src.startsWith('data:'))) {
      urls.push(src);
    }
  });
  
  return urls;
}