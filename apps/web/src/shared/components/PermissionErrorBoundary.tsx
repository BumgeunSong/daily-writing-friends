import { Lock } from 'lucide-react';
import React from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

import { STORAGE_KEYS, storage } from '@/shared/lib/storage';
import { useNavigate } from '@/shared/navigation';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';

const ACCESS_DENIED_TITLE = '아직 참여하지 않은 기수예요';
const ACCESS_DENIED_BODY =
  '이 기수 게시판은 참여한 분들만 읽을 수 있어요. 신청을 마치셨다면 기수가 시작하기 하루 전에 따로 연락드릴게요.';
const ACCESS_DENIED_ACTION = '내 게시판으로 가기';

/**
 * Terminal state for a board the reader has no permission on. Rendered as a
 * full page rather than a dialog: there is nothing behind it to return to, and
 * a dismissable dialog left the reader stranded on a blank screen.
 */
function BoardAccessDenied() {
  const navigate = useNavigate();

  // Clearing the stored board keeps /boards from bouncing straight back here.
  const handleLeave = () => {
    storage.remove(STORAGE_KEYS.BOARD_ID);
    navigate('/boards', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-3 md:px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <Lock className="mx-auto size-12 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-balance text-xl font-semibold text-foreground md:text-2xl">
          {ACCESS_DENIED_TITLE}
        </h1>
        <p className="text-reading text-pretty text-muted-foreground">{ACCESS_DENIED_BODY}</p>
        <Button onClick={handleLeave} className="h-11 w-full">
          {ACCESS_DENIED_ACTION}
        </Button>
      </div>
    </div>
  );
}

export function PermissionErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(true);

  // Check if it's a 503 network error
  if (isRouteErrorResponse(error) && error.status === 503) {
    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>네트워크 오류</AlertDialogTitle>
            <AlertDialogDescription>
              {typeof error.data === 'string' ? error.data : '네트워크 연결에 문제가 있어요.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setOpen(false);
              navigate('/boards', { replace: true });
            }}>홈으로</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setOpen(false);
              window.location.reload();
            }}>다시 시도</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (isRouteErrorResponse(error) && error.status === 403) {
    return <BoardAccessDenied />;
  }

  // For other errors, show a generic error message
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h2 className="mb-2 text-xl font-semibold">문제가 발생했습니다</h2>
      <p className="mb-4 text-gray-600">
        {isRouteErrorResponse(error) 
          ? `오류 ${error.status}: ${error.data || error.statusText}`
          : '알 수 없는 오류가 발생했습니다.'
        }
      </p>
      <button 
        onClick={() => navigate(-1)}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        돌아가기
      </button>
    </div>
  );
}