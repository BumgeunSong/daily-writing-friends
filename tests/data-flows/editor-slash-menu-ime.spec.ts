import { test, expect, type CDPSession, type Page } from '@playwright/test';

/**
 * 슬래시(/) 블록 삽입 메뉴를 실제 Chromium에서 확인한다.
 * 한글 IME 조합은 CDP Input.imeSetComposition으로 실제 compositionstart/update/end를 만든다.
 *
 * 전제: e2e@example.com(보드 e2e-test-board 쓰기 권한)이 시드되어 있고 storageState로 로그인된다.
 */

const BOARD_ID = 'e2e-test-board';
const SHOT_DIR = process.env.E2E_SHOT_DIR;

function composingSteps(syllable: string): string[] {
  const jamo = [...syllable.normalize('NFD')];
  return jamo.map((_, i) => jamo.slice(0, i + 1).join('').normalize('NFC'));
}

async function composeSyllable(cdp: CDPSession, syllable: string) {
  for (const state of composingSteps(syllable)) {
    await cdp.send('Input.imeSetComposition', {
      text: state,
      selectionStart: state.length,
      selectionEnd: state.length,
    });
  }
}

async function typeKorean(page: Page, cdp: CDPSession, text: string) {
  for (const char of text) {
    if (!/[가-힣]/.test(char)) {
      await page.keyboard.type(char);
      continue;
    }
    await composeSyllable(cdp, char);
    await cdp.send('Input.insertText', { text: char });
  }
}

async function openEditor(page: Page) {
  await page.goto(`/create/${BOARD_ID}`);
  const editor = page.locator('.ProseMirror').first();
  await editor.click();
  const cdp = await page.context().newCDPSession(page);
  return { editor, cdp };
}

const menu = (page: Page) => page.getByRole('listbox', { name: '블록 삽입' });
const optionTitles = (page: Page) => menu(page).getByRole('option').allTextContents();
const activeOption = (page: Page) => menu(page).locator('[aria-selected="true"]');

async function shoot(page: Page, name: string) {
  if (SHOT_DIR) await page.screenshot({ path: `${SHOT_DIR}/${name}.png` });
}

test.describe('슬래시 메뉴 열기', () => {
  test('빈 줄에서 /를 치면 7개 항목이 열리고, 문장 중간의 /는 열지 않는다', async ({ page }) => {
    const { editor } = await openEditor(page);

    await page.keyboard.type('/');
    await expect(menu(page)).toBeVisible();
    expect(await optionTitles(page)).toEqual([
      '이미지', '제목 1', '제목 2', '인용', '글머리 목록', '번호 목록', '구분선',
    ]);
    await shoot(page, 'slash-open');

    await page.keyboard.press('Escape');
    await expect(menu(page)).toBeHidden();

    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('2026/11');
    await expect(menu(page)).toBeHidden();
    await expect(editor).toContainText('2026/11');

    // 공백 뒤의 /도 줄 처음이 아니면 메뉴를 열지 않는다. 슬래시 앞이 공백이 아닌 위 경우는
    // Suggestion의 기본 규칙이 먼저 막아서 이 앱의 허용 정책을 검증하지 못한다.
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('안녕하세요 /');
    await expect(menu(page)).toBeHidden();
    await expect(editor).toContainText('안녕하세요 /');
  });
});

test.describe('한글 IME 조합과 슬래시 메뉴', () => {
  test('조합 중에도 필터링이 이어지고, 조합 중 Enter는 메뉴 선택이 아니다', async ({ page }) => {
    const { editor, cdp } = await openEditor(page);
    await page.keyboard.type('/');

    await composeSyllable(cdp, '제');
    await expect(menu(page)).toBeVisible();
    expect(await optionTitles(page)).toEqual(['제목 1', '제목 2']);

    await shoot(page, 'slash-ime-composing');

    // 조합이 끝나지 않은 상태의 Enter는 조합기의 키다. 메뉴가 가로채 블록을 바꾸면 안 된다.
    // (CDP의 Enter는 조합을 확정하며 문단을 나누지만, 실제 IME는 확정만 한다. 어느 쪽이든 항목은 선택되지 않는다.)
    await page.keyboard.press('Enter');
    await expect(editor.locator('h1, h2, blockquote, ul, ol, hr')).toHaveCount(0);
    await expect(editor.locator('p').first()).toHaveText('/제');
  });

  test('조합이 모두 끝난 뒤에는 방향키와 Enter로 항목을 고를 수 있다', async ({ page }) => {
    const { editor, cdp } = await openEditor(page);
    await page.keyboard.type('/');
    await composeSyllable(cdp, '제');
    await cdp.send('Input.insertText', { text: '제' });
    await composeSyllable(cdp, '목');
    await cdp.send('Input.insertText', { text: '목' });
    expect(await optionTitles(page)).toEqual(['제목 1', '제목 2']);

    await page.keyboard.press('ArrowDown');
    await expect(activeOption(page)).toHaveText('제목 2');
    await page.keyboard.press('Enter');

    await expect(editor.locator('h2')).toHaveCount(1);
    await expect(editor).not.toContainText('/');
    await expect(menu(page)).toBeHidden();
  });

  test('받침이 들어간 미완성 음절(젬)에서도 제목 항목이 사라지지 않는다', async ({ page }) => {
    const { cdp } = await openEditor(page);
    await page.keyboard.type('/');

    await composeSyllable(cdp, '젬');

    expect(await optionTitles(page)).toEqual(['제목 1', '제목 2']);
  });

  test('조합이 끝난 뒤 고른 제목 블록에 한글을 이어 쓸 수 있다', async ({ page }) => {
    const { editor, cdp } = await openEditor(page);
    await typeKorean(page, cdp, '/인용');
    await expect(menu(page)).toBeVisible();
    await page.keyboard.press('Enter');

    await typeKorean(page, cdp, '한 줄');

    await expect(editor.locator('blockquote')).toContainText('한 줄');
  });
});

test.describe('항목별 삽입', () => {
  for (const [query, selector] of [
    ['제목 1', 'h1'], ['제목 2', 'h2'], ['인용', 'blockquote'],
    ['글머리 목록', 'ul'], ['번호 목록', 'ol'], ['구분선', 'hr'],
  ] as const) {
    test(`${query}: 클릭하면 /검색어가 지워지고 ${selector}가 삽입된다`, async ({ page }) => {
      const { editor } = await openEditor(page);
      await page.keyboard.type('/');

      await menu(page).getByRole('option', { name: query, exact: true }).click();

      await expect(editor.locator(selector)).toHaveCount(1);
      await expect(editor).not.toContainText('/');
      await expect(menu(page)).toBeHidden();
    });
  }

  test('이미지: 고르면 /검색어가 지워지고 파일 선택기가 열린다', async ({ page }) => {
    const { editor } = await openEditor(page);
    await page.keyboard.type('/image');
    await expect(menu(page).getByRole('option')).toHaveCount(1);

    const chooser = page.waitForEvent('filechooser');
    await page.keyboard.press('Enter');
    await chooser;

    await expect(editor).not.toContainText('/image');
  });
});

test.describe('모바일 뷰포트', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });

  test('메뉴가 화면 안에 들어오고 항목 터치 영역이 44px 이상이다', async ({ page }) => {
    await openEditor(page);
    await page.keyboard.type('/');
    await expect(menu(page)).toBeVisible();

    const box = await menu(page).boundingBox();
    const viewport = page.viewportSize()!;
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);

    const option = await menu(page).getByRole('option').first().boundingBox();
    expect(option!.height).toBeGreaterThanOrEqual(44);
    await shoot(page, 'slash-mobile');
  });

  test('가상 키보드로 보이는 높이가 줄어도 메뉴가 화면 안에 머문다', async ({ page }) => {
    await openEditor(page);
    await page.setViewportSize({ width: 375, height: 360 });
    await page.keyboard.type('/');
    await expect(menu(page)).toBeVisible();

    const box = await menu(page).boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(360);
    await shoot(page, 'slash-mobile-keyboard');
  });
});
