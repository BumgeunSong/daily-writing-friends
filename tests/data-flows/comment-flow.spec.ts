import { randomUUID } from 'node:crypto';

import { test, expect } from '@playwright/test';
import { cleanupWriteComments } from '../helpers/seed-cleanup';

const BOARD_ID = 'e2e-test-board';
const POST_ID = 'e2e-post-000';

test.describe('Comment Flow', () => {
  // 테스트마다 고유한 본문을 써서 다른 실행이나 병렬 테스트의 댓글과 섞이지 않게 한다.
  // 이전 실행이 남긴 댓글은 본문이 달라 이 테스트의 조회에 걸리지 않으므로 시작 전 일괄 정리는 하지 않는다
  // (병렬로 도는 다른 실행의 댓글을 지울 수 있다).
  let commentText: string;

  test.beforeEach(() => {
    commentText = `e2e-write-comment-${randomUUID()}`;
  });

  test.afterEach(async () => {
    await cleanupWriteComments(commentText);
  });

  test('write a comment and verify it appears', async ({ page }) => {
    // Navigate to the seeded post's detail page
    await page.goto(`/board/${BOARD_ID}/post/${POST_ID}`);
    await page.waitForLoadState('networkidle');

    // Wait for the post detail to render
    await expect(page.getByRole('heading', { name: 'E2E Seeded Post 1' })).toBeVisible({ timeout: 30000 });

    // Find the comment input textbox
    const commentInput = page.getByRole('textbox', { name: /댓글|글값/ });
    await expect(commentInput).toBeVisible({ timeout: 10000 });
    await commentInput.fill(commentText);

    // Submit the comment
    const submitButton = page.getByRole('button', { name: '댓글 등록' });
    await submitButton.click();

    // 등록되면 입력창이 비워지고 댓글 목록에 방금 쓴 댓글이 보인다.
    await expect(commentInput).toHaveText('');
    await expect(page.getByText(commentText)).toBeVisible({ timeout: 10000 });
  });
});
