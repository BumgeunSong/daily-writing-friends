import { useState, useCallback } from 'react';
import { createVideoEmbed, validateVideoEmbed, VideoEmbed } from '../model/VideoEmbed';
import { getReliableThumbnail } from '../utils/thumbnailUtils';
import { parseYouTubeUrl } from '../utils/videoUtils';

interface UseVideoEmbedDialogProps {
  insertVideo: (videoData: VideoEmbed) => void;
}

export function useVideoEmbedDialog({ insertVideo }: UseVideoEmbedDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<VideoEmbed | null>(null);

  const openDialog = useCallback(() => {
    setIsOpen(true);
    setError(null);
    setPreviewData(null);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setError(null);
    setPreviewData(null);
    setIsProcessing(false);
  }, []);

  const processVideoUrl = useCallback(async (url: string): Promise<VideoEmbed | null> => {
    try {
      setIsProcessing(true);
      setError(null);

      // Parse YouTube URL
      const parsedData = parseYouTubeUrl(url);
      if (!parsedData) {
        throw new Error('유효하지 않은 YouTube URL입니다.');
      }

      // Get reliable thumbnail
      const thumbnailResult = await getReliableThumbnail(parsedData.videoId);

      // Create video embed data
      const videoData = createVideoEmbed(parsedData.videoId, url, {
        thumbnail: thumbnailResult.url,
      });

      // Add timestamp if present
      if (parsedData.timestamp) {
        videoData.timestamp = parsedData.timestamp;
      }

      // Validate the created data
      const validatedData = validateVideoEmbed(videoData);
      if (!validatedData) {
        throw new Error('비디오 데이터 생성 중 오류가 발생했습니다.');
      }

      return validatedData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleUrlSubmit = useCallback(async (url: string) => {
    const videoData = await processVideoUrl(url);
    if (videoData) {
      setPreviewData(videoData);
    }
  }, [processVideoUrl]);

  const handleInsertVideo = useCallback(() => {
    console.log('🎬 [VideoDialog] Insert button clicked', { previewData });

    if (previewData) {
      console.log('🎬 [VideoDialog] Preview data available, closing dialog');
      // Close dialog first to prevent React re-render conflicts
      closeDialog();

      console.log('🎬 [VideoDialog] Dialog closed, calling insertVideo');
      // Insert video after dialog is closed
      insertVideo(previewData);
    } else {
      console.warn('🎬 [VideoDialog] No preview data available');
    }
  }, [previewData, insertVideo, closeDialog]);

  const handleUrlPaste = useCallback(async (pastedText: string) => {
    // Auto-process pasted YouTube URLs
    const lines = pastedText.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && (trimmedLine.includes('youtube.com') || trimmedLine.includes('youtu.be'))) {
        const videoData = await processVideoUrl(trimmedLine);
        if (videoData) {
          // Auto-insert if it's a valid YouTube URL with a slight delay
          setTimeout(() => {
            insertVideo(videoData);
          }, 50);
          return true; // Indicate that we handled the paste
        }
      }
    }
    return false; // Indicate that we didn't handle the paste
  }, [processVideoUrl, insertVideo]);

  return {
    isOpen,
    openDialog,
    closeDialog,
    isProcessing,
    error,
    previewData,
    handleUrlSubmit,
    handleInsertVideo,
    handleUrlPaste,
  };
}