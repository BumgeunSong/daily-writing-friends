import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as SupabaseClientModule from '@/shared/api/supabaseClient';
import type { AuthUser } from '@/shared/hooks/useAuth';

const mockUsersInsert = vi.fn();
const mockUsersUpsert = vi.fn();
const mockPermissionsUpsert = vi.fn();
const mockGetSupabaseClient = vi.fn();
const mockFetchUserFromSupabase = vi.fn();

vi.mock('@/firebase', () => ({ storage: {} }));
vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

vi.mock('@/shared/api/supabaseClient', async () => {
  const actual = await vi.importActual<typeof SupabaseClientModule>(
    '@/shared/api/supabaseClient',
  );
  return {
    ...actual,
    getSupabaseClient: () => mockGetSupabaseClient(),
  };
});

vi.mock('@/shared/api/supabaseReads', () => ({
  fetchUserFromSupabase: (...args: unknown[]) => mockFetchUserFromSupabase(...args),
  fetchAllUsersFromSupabase: vi.fn(),
  fetchUsersWithBoardPermissionFromSupabase: vi.fn(),
}));

vi.mock('@/sentry', () => ({
  addSentryBreadcrumb: vi.fn(),
}));

import { createUserIfNotExists } from './user';

const authUser: AuthUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
};

describe('createUserIfNotExists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSupabaseClient.mockReturnValue({
      from: (table: string) => {
        if (table === 'users') {
          return { insert: mockUsersInsert, upsert: mockUsersUpsert };
        }
        if (table === 'user_board_permissions') {
          return { upsert: mockPermissionsUpsert };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    });
    // Default: success.
    mockUsersInsert.mockResolvedValue({ error: null });
    mockUsersUpsert.mockResolvedValue({ error: null });
    mockPermissionsUpsert.mockResolvedValue({ error: null });
  });

  it('skips insert when user already exists', async () => {
    mockFetchUserFromSupabase.mockResolvedValue({ uid: 'test-uid' });

    await createUserIfNotExists(authUser);

    expect(mockUsersInsert).not.toHaveBeenCalled();
    expect(mockUsersUpsert).not.toHaveBeenCalled();
    expect(mockPermissionsUpsert).not.toHaveBeenCalled();
  });

  it('writes the users row with idempotent upsert (onConflict: id, ignoreDuplicates: true)', async () => {
    mockFetchUserFromSupabase.mockResolvedValue(null);

    await createUserIfNotExists(authUser);

    expect(mockUsersUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'test-uid', email: 'test@example.com' }),
      expect.objectContaining({ onConflict: 'id', ignoreDuplicates: true }),
    );
    expect(mockUsersInsert).not.toHaveBeenCalled();
  });

  it('does not throw when a concurrent caller has already inserted the row (TOCTOU race)', async () => {
    // Simulates the production race in Sentry issue 7460374739:
    //   - fetchUser sees no row (race partner has not committed yet from this read's view)
    //   - the actual write hits a row that exists by then
    // With ON CONFLICT DO NOTHING the server returns no error.
    // Without it, the server returns 23505 and we crash.
    mockFetchUserFromSupabase.mockResolvedValue(null);
    mockUsersInsert.mockResolvedValue({
      error: { message: 'duplicate key value violates unique constraint "users_pkey"', code: '23505', details: null, hint: '' },
    });
    mockUsersUpsert.mockResolvedValue({ error: null });

    await expect(createUserIfNotExists(authUser)).resolves.toBeUndefined();
  });
});
