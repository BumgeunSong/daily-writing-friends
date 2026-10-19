import { getSupabaseClient } from '@/shared/external/supabaseClient';

export type ImageBucket = 'post-images' | 'profile-photos' | 'feedback-screenshots';

interface UploadImageParams {
  bucket: ImageBucket;
  path: string;
  file: Blob;
  contentType: string;
  cacheControl?: string;
}

const DEFAULT_CACHE_CONTROL_SECONDS = '31536000';

/**
 * Upload an image to a Supabase Storage bucket and return its public URL.
 * Object paths must start with the caller's auth uid (enforced by RLS); the bucket is
 * append-only, so `upsert` stays off and every upload needs a fresh path.
 */
export async function uploadImage({
  bucket,
  path,
  file,
  contentType,
  cacheControl = DEFAULT_CACHE_CONTROL_SECONDS,
}: UploadImageParams): Promise<string> {
  const storage = getSupabaseClient().storage.from(bucket);
  const { error } = await storage.upload(path, file, { contentType, cacheControl, upsert: false });
  if (error) throw error;
  return storage.getPublicUrl(path).data.publicUrl;
}

export async function getCurrentUserId(): Promise<string> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw error;
  const uid = data.session?.user.id;
  if (!uid) throw new Error('로그인이 필요합니다.');
  return uid;
}
