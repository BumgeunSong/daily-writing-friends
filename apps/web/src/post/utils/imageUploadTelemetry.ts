import * as Sentry from '@sentry/react';
import type { ProcessingFailure } from '@/post/utils/ImageUtils';

const HEIC_FAILURE_MESSAGE =
  '이 HEIC 파일을 변환할 수 없습니다. JPEG 또는 PNG로 저장 후 다시 시도해주세요.';

const captureProcessingFailure = (failure: ProcessingFailure, error: unknown): void => {
  Sentry.captureException(error, {
    tags: { feature: 'image_upload', operation: failure },
  });
};

export { captureProcessingFailure, HEIC_FAILURE_MESSAGE };
