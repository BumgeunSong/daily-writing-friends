import * as Sentry from '@sentry/react';
import type { ProcessingFailure } from '@/post/web/ImageUtils';

const captureProcessingFailure = (failure: ProcessingFailure, error: unknown): void => {
  Sentry.captureException(error, {
    tags: { feature: 'image_upload', operation: failure },
  });
};

export { captureProcessingFailure };
