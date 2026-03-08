import * as Sentry from '@sentry/react'
import type { toast as toastFn } from 'sonner'

/**
 * 에러 발생 시 토스트 메시지를 표시하는 함수
 * @param toast toast 함수
 * @param error 발생한 에러
 */
export const showErrorToast = (toast: typeof toastFn, error: unknown) => {
    Sentry.captureException(error);

    let errorMessage = "알 수 없는 오류가 발생했습니다. 다시 시도해주세요.";

    if (error instanceof Error) {
        errorMessage = error.message;
    }

    toast.error(errorMessage, {
        position: 'bottom-center',
        duration: 5000, // 5초 동안 표시
    });
};
