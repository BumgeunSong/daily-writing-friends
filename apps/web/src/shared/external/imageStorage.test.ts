import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockFrom = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/shared/external/supabaseClient', () => ({
  getSupabaseClient: () => ({
    storage: { from: mockFrom },
    auth: { getSession: mockGetSession },
  }),
}));

import { getCurrentUserId, uploadImage } from './imageStorage';

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue({ upload: mockUpload, getPublicUrl: mockGetPublicUrl });
});

describe('uploadImage', () => {
  it('uploads without upsert and returns the public URL', async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://x.supabase.co/p.jpg' } });
    const file = new Blob(['x'], { type: 'image/jpeg' });

    const url = await uploadImage({
      bucket: 'post-images',
      path: 'user-1/20261018/120000_a.jpg',
      file,
      contentType: 'image/jpeg',
    });

    expect(mockFrom).toHaveBeenCalledWith('post-images');
    expect(mockUpload).toHaveBeenCalledWith(
      'user-1/20261018/120000_a.jpg',
      file,
      expect.objectContaining({ contentType: 'image/jpeg', upsert: false }),
    );
    expect(url).toBe('https://x.supabase.co/p.jpg');
  });

  it('throws the storage error instead of returning a URL', async () => {
    mockUpload.mockResolvedValue({ error: new Error('row-level security policy') });
    await expect(
      uploadImage({ bucket: 'profile-photos', path: 'a/b.jpg', file: new Blob(), contentType: 'image/jpeg' }),
    ).rejects.toThrow('row-level security policy');
    expect(mockGetPublicUrl).not.toHaveBeenCalled();
  });
});

describe('getCurrentUserId', () => {
  it('returns the session user id', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    await expect(getCurrentUserId()).resolves.toBe('user-1');
  });

  it('throws when there is no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(getCurrentUserId()).rejects.toThrow();
  });
});
