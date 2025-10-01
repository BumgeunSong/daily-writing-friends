import * as Sentry from '@sentry/react';
import { MessageCircle, Send, Paperclip, X, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { auth } from '@/firebase';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { useUser } from '@/user/hooks/useUser';
import { uploadFeedbackScreenshot } from '@/shared/utils/uploadFeedbackScreenshot';

interface SentryFeedbackDialogProps {
  triggerButton?: React.ReactNode;
}

export function SentryFeedbackDialog({ triggerButton }: SentryFeedbackDialogProps) {
  const currentUser = auth.currentUser;
  const { userData } = useUser(currentUser?.uid);

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  // Auto-fill name and email from user data
  const userName = userData?.name || currentUser?.displayName || '';
  const userEmail = userData?.email || currentUser?.email || '';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setScreenshotFile(file);

    try {
      const result = await uploadFeedbackScreenshot(file);

      if (result.success && result.url) {
        setScreenshotUrl(result.url);
        toast.success('스크린샷이 첨부되었습니다.', { position: 'bottom-center' });
      } else {
        toast.error(result.error || '스크린샷 업로드에 실패했습니다.', {
          position: 'bottom-center',
        });
        setScreenshotFile(null);
      }
    } catch (error) {
      toast.error('스크린샷 업로드 중 오류가 발생했습니다.', { position: 'bottom-center' });
      setScreenshotFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      toast.error('피드백 내용을 입력해주세요.', { position: 'bottom-center' });
      return;
    }

    if (!userName || !userEmail) {
      toast.error('사용자 정보를 불러올 수 없습니다.', { position: 'bottom-center' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Add screenshot URL to message if available
      let feedbackMessage = message;
      if (screenshotUrl) {
        feedbackMessage += `\n\n스크린샷: ${screenshotUrl}`;
      }

      Sentry.captureFeedback(
        {
          name: userName,
          email: userEmail,
          message: feedbackMessage,
        },
        {
          includeReplay: true,
        },
      );

      toast.success('피드백이 전송되었습니다. 감사합니다!', { position: 'bottom-center' });
      setMessage('');
      setScreenshotFile(null);
      setScreenshotUrl(null);
      setOpen(false);
    } catch (error) {
      toast.error('피드백 전송에 실패했습니다. 다시 시도해주세요.', {
        position: 'bottom-center',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {triggerButton || (
          <Button
            variant="ghost"
            className="reading-hover reading-focus flex h-14 w-full items-center justify-start gap-3 rounded-none border-b border-border/30 px-4 text-base transition-all duration-200"
          >
            <MessageCircle className="size-5 text-muted-foreground" />
            <span className="text-foreground">피드백 보내기</span>
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md w-[calc(100vw-2rem)]">
        <AlertDialogHeader>
          <AlertDialogTitle>피드백 보내기</AlertDialogTitle>
        </AlertDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-hidden">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">이름</label>
            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
              {userName || '로딩 중...'}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">이메일</label>
            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
              {userEmail || '로딩 중...'}
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium text-foreground">
              피드백 내용 <span className="text-destructive">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="개선이 필요한 점이나 문제를 알려주세요."
              required
              rows={8}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-2 min-w-0">
            <label className="text-sm font-medium text-foreground">스크린샷 (선택)</label>
            {screenshotFile ? (
              <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 p-2 min-w-0">
                {isUploading ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {screenshotFile.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveScreenshot}
                  disabled={isUploading}
                  className="h-6 w-6 shrink-0 p-0"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex">
                <input
                  type="file"
                  id="screenshot"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="hidden"
                />
                <label htmlFor="screenshot">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading}
                    className="gap-2"
                    asChild
                  >
                    <span>
                      {isUploading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          업로드 중...
                        </>
                      ) : (
                        <>
                          <Paperclip className="size-4" />
                          스크린샷 첨부
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            )}
          </div>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="m-0 flex-1">취소</AlertDialogCancel>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  전송 중...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  전송
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
