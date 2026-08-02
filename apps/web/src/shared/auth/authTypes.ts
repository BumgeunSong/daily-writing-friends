/**
 * AuthUser is a backward-compatible wrapper around Supabase User.
 * It maps Supabase fields to the same interface Firebase had,
 * so 30+ consumer files can keep using `currentUser.uid` unchanged.
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
