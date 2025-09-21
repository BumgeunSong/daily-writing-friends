import { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { parseYouTubeUrl } from '../utils/videoUtils';

interface VideoEmbedDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onVideoInsert: (url: string) => void;
}

const DIALOG_TITLE = '동영상 첨부';
const DIALOG_DESCRIPTION = 'YouTube 동영상 링크만 가능해요.';
const PLACEHOLDER_URL = 'https://www.youtube.com/watch?v=...';
const BUTTON_CANCEL = '취소';
const BUTTON_CONFIRM = '확인';

export function VideoEmbedDialog({
  isOpen,
  onOpenChange,
  onVideoInsert,
}: VideoEmbedDialogProps) {
  const [videoUrl, setVideoUrl] = useState('');

  // Validate YouTube URL
  const isValidUrl = useMemo(() => {
    if (!videoUrl.trim()) return true; // Empty is valid
    return parseYouTubeUrl(videoUrl.trim()) !== null;
  }, [videoUrl]);

  const handleClose = useCallback(() => {
    setVideoUrl('');
    onOpenChange(false);
  }, [onOpenChange]);

  const handleVideoInsert = useCallback(() => {
    const trimmedUrl = videoUrl.trim();
    if (trimmedUrl && isValidUrl) {
      onVideoInsert(trimmedUrl);
      setVideoUrl('');
      onOpenChange(false);
    }
  }, [videoUrl, isValidUrl, onVideoInsert, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && videoUrl.trim() && isValidUrl) {
        e.preventDefault();
        handleVideoInsert();
      }
    },
    [videoUrl, isValidUrl, handleVideoInsert]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{DIALOG_TITLE}</DialogTitle>
          <DialogDescription>{DIALOG_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              id="video-url"
              type="url"
              placeholder={PLACEHOLDER_URL}
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className={videoUrl.trim() && !isValidUrl ? 'border-destructive' : undefined}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            {BUTTON_CANCEL}
          </Button>
          <Button
            type="button"
            onClick={handleVideoInsert}
            disabled={!videoUrl.trim() || !isValidUrl}
          >
            {BUTTON_CONFIRM}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}