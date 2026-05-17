// Error types thrown by the avatar upload pipeline (resizeImageBlob → uploadUserProfilePhoto).
// `messageKey` is an i18n-style key; user-facing strings live at the UI layer, not here.

export abstract class AvatarUploadError extends Error {
  abstract readonly messageKey: string;
}

export class UnsupportedImageError extends AvatarUploadError {
  readonly messageKey = 'error.avatar.unsupported';

  constructor(message = 'Image could not be decoded') {
    super(message);
    this.name = 'UnsupportedImageError';
  }
}

export class FileTooLargeError extends AvatarUploadError {
  readonly messageKey = 'error.avatar.tooLarge';

  constructor(message = 'Image exceeds maximum allowed size') {
    super(message);
    this.name = 'FileTooLargeError';
  }
}
