import { useState } from 'react';
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
import { Label } from '@/shared/ui/label';
import { Loader2, Play, AlertCircle } from 'lucide-react';
import { VideoEmbed } from '../model/VideoEmbed';
import { formatTimestring } from '../utils/videoUtils';

interface VideoEmbedDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (url: string) => void;
  onInsert: () => void;
  isProcessing: boolean;
  error: string | null;
  previewData: VideoEmbed | null;
}

export function VideoEmbedDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  onInsert,
  isProcessing,
  error,
  previewData,
}: VideoEmbedDialogProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !isProcessing) {
      onSubmit(url.trim());
    }
  };

  const handleClose = () => {
    setUrl('');
    onOpenChange(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    // Clear any existing preview when URL changes
    if (previewData && e.target.value !== previewData.originalUrl) {
      // We could add a prop to clear preview, but for now this is handled by parent
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>YouTube 동영상 삽입</DialogTitle>
          <DialogDescription>
            YouTube 동영상 URL을 입력하여 게시글에 삽입하세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-url">YouTube URL</Label>
            <Input
              id="video-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={handleInputChange}
              disabled={isProcessing}
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {previewData && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">미리보기</div>
              <div
                className="group relative overflow-hidden rounded-lg bg-black"
                style={{ aspectRatio: previewData.aspectRatio === '16:9' ? '16/9' : '4/3' }}
              >
                <img
                  src={previewData.thumbnail}
                  alt={`동영상 썸네일: ${previewData.title || 'YouTube 동영상'}`}
                  className="h-full w-full object-cover"
                />

                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90">
                    <Play className="h-5 w-5 text-gray-900 ml-0.5" />
                  </div>
                </div>

                {/* Timestamp overlay */}
                {previewData.timestamp && (
                  <div className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 text-xs text-white">
                    {formatTimestring(previewData.timestamp)}에서 시작
                  </div>
                )}
              </div>

              {/* Video info */}
              {previewData.title && (
                <div className="text-sm text-muted-foreground">
                  제목: {previewData.title}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
            >
              취소
            </Button>

            {!previewData ? (
              <Button
                type="submit"
                disabled={!url.trim() || isProcessing}
              >
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isProcessing ? '처리 중...' : '미리보기'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onInsert}
                disabled={isProcessing}
              >
                삽입
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}