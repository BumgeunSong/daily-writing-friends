export const UPLOAD_LIMITS = {
  MAX_FILES: 10,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: 'image/*',
} as const;

export const UPLOAD_MESSAGES = {
  // Validation messages
  MAX_FILES_EXCEEDED: (count: number) =>
    `${count}개를 선택하셨습니다. 최대 10개까지만 업로드 가능합니다.`,
  FILE_SIZE_EXCEEDED: '파일 크기는 5MB를 초과할 수 없습니다',
  INVALID_FILE_TYPE: '이미지 파일만 업로드할 수 있습니다',
  HEIC_CONVERSION_FAILED: 'HEIC 파일 변환에 실패했습니다',

  // Progress messages
  UPLOADING: (current: number, total: number, fileName: string) =>
    `업로드 중 (${current}/${total}): ${fileName}`,

  // Completion messages
  UPLOAD_SUCCESS: (count: number) => `${count}개 이미지 업로드 완료`,
  UPLOAD_PARTIAL: (success: number, failed: number) =>
    `${success}개 업로드 완료, ${failed}개 실패`,
  UPLOAD_FAILED: '모든 이미지 업로드 실패',

  // Dialog messages
  DIALOG_TITLE: '이미지 첨부하기',
  DIALOG_DESCRIPTION: '최대 10개까지 첨부할 수 있어요',
  DIALOG_BUTTON: '파일 선택',
} as const;