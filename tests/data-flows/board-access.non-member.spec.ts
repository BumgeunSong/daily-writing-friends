import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/auth';
import { authenticateViaRest, getSupabaseEnv } from '../utils/supabase-auth';

const BOARD_ID = 'e2e-test-board';

test.describe('참여하지 않은 기수의 게시판', () => {
  test('비멤버는 글 목록 대신 참여하지 않은 기수라는 안내를 본다', async ({ page }) => {
    // 비멤버(e2e2@, 이 게시판 멤버십 없음)로 게시판을 연다.
    await page.goto(`/board/${BOARD_ID}`);

    // 안내가 먼저 보여야 "글이 0개"가 아직 로딩 중이라서 생긴 거짓 통과가 되지 않는다.
    await expect(page.getByRole('heading', { name: '아직 참여하지 않은 기수예요' })).toBeVisible();

    const postCards = page.getByRole('button', { name: '게시글 상세로 이동' });
    await expect(postCards).toHaveCount(0);
  });
});

test.describe('참여하지 않은 기수의 글을 DB가 내주지 않는다', () => {
  // 화면 차단이 풀려도 서버가 읽기를 막아야 하므로 REST로 직접 읽는다.
  // 같은 요청을 멤버로 보내 "원래 글이 있다"는 대조군을 둔다.
  const readBoardRows = async (table: 'posts' | 'posts_feed', accessToken: string) => {
    const { supabaseUrl, anonKey } = getSupabaseEnv();
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?board_id=eq.${BOARD_ID}&select=id`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status).toBe(200);
    return (await response.json()) as { id: string }[];
  };

  let memberToken: string;
  let nonMemberToken: string;

  test.beforeAll(async () => {
    const { supabaseUrl, anonKey } = getSupabaseEnv();
    memberToken = (await authenticateViaRest(supabaseUrl, anonKey, TEST_USERS.REGULAR.email, TEST_USERS.REGULAR.password)).access_token;
    nonMemberToken = (await authenticateViaRest(supabaseUrl, anonKey, TEST_USERS.SECOND.email, TEST_USERS.SECOND.password)).access_token;
  });

  for (const table of ['posts', 'posts_feed'] as const) {
    test(`비멤버가 ${table}를 읽으면 빈 목록이고 멤버는 글을 받는다`, async () => {
      expect((await readBoardRows(table, memberToken)).length).toBeGreaterThan(0);
      expect(await readBoardRows(table, nonMemberToken)).toEqual([]);
    });
  }
});
