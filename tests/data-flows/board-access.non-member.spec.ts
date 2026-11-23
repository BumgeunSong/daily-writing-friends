import { test, expect } from '@playwright/test';

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
