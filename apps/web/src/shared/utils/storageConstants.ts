// Cache-Control header value applied to avatar uploads (30 days).
// Avatars rarely change; aggressive caching reduces re-fetches on every render.
export const AVATAR_CACHE_CONTROL = 'public, max-age=2592000';
