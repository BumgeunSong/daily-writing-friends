import { describe, expect, it } from 'vitest';

import {
  AvatarUploadError,
  FileTooLargeError,
  UnsupportedImageError,
} from './avatarUpload';

describe('avatar upload errors', () => {
  it('UnsupportedImageError carries messageKey and extends AvatarUploadError', () => {
    const err = new UnsupportedImageError();
    expect(err).toBeInstanceOf(AvatarUploadError);
    expect(err).toBeInstanceOf(Error);
    expect(err.messageKey).toBe('error.avatar.unsupported');
    expect(err.name).toBe('UnsupportedImageError');
  });

  it('FileTooLargeError carries messageKey and extends AvatarUploadError', () => {
    const err = new FileTooLargeError();
    expect(err).toBeInstanceOf(AvatarUploadError);
    expect(err).toBeInstanceOf(Error);
    expect(err.messageKey).toBe('error.avatar.tooLarge');
    expect(err.name).toBe('FileTooLargeError');
  });
});
