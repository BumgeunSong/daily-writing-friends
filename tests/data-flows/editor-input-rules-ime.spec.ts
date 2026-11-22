import { test, expect, type CDPSession, type Locator, type Page } from '@playwright/test';

/**
 * 한글 IME 조합 중에도 에디터 입력 규칙과 Backspace 되돌리기가 동작하는지 확인한다.
 * CDP Input.imeSetComposition으로 실제 compositionstart/update/end 이벤트를 만든다.
 *
 * 전제: e2e@example.com(보드 e2e-test-board 쓰기 권한)이 시드되어 있고 storageState로 로그인된다.
 */

const BOARD_ID = 'e2e-test-board';
const SHOT_DIR = process.env.E2E_SHOT_DIR;

function composingSteps(syllable: string): string[] {
  const jamo = [...syllable.normalize('NFD')];
  return jamo.map((_, i) => jamo.slice(0, i + 1).join('').normalize('NFC'));
}

const isHangulSyllable = (char: string) => /[가-힣]/.test(char);

async function typeKorean(page: Page, cdp: CDPSession, text: string) {
  for (const char of text) {
    if (!isHangulSyllable(char)) {
      await page.keyboard.type(char);
      continue;
    }
    for (const state of composingSteps(char)) {
      await cdp.send('Input.imeSetComposition', {
        text: state,
        selectionStart: state.length,
        selectionEnd: state.length,
      });
    }
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

const firstBlock = (editor: Locator) =>
  editor.evaluate((el) => ({
    tag: el.firstElementChild?.tagName,
    text: el.firstElementChild?.textContent,
  }));

async function shoot(page: Page, name: string) {
  if (SHOT_DIR) await page.screenshot({ path: `${SHOT_DIR}/${name}.png` });
}

test.describe('한글 IME 조합과 입력 규칙', () => {
  test('조합 중에 compositionstart/update/end 이벤트가 실제로 발생한다', async ({ page }) => {
    const { editor, cdp } = await openEditor(page);
    await editor.evaluate((el) => {
      (window as unknown as { __events: string[] }).__events = [];
      for (const type of ['compositionstart', 'compositionupdate', 'compositionend']) {
        el.addEventListener(type, () => (window as unknown as { __events: string[] }).__events.push(type));
      }
    });

    await typeKorean(page, cdp, '안녕');

    const events = await page.evaluate(() => (window as unknown as { __events: string[] }).__events);
    expect(events).toContain('compositionstart');
    expect(events).toContain('compositionupdate');
    expect(events).toContain('compositionend');
  });

  for (const [typed, tag] of [
    ['# ', 'H1'],
    ['## ', 'H2'],
    ['> ', 'BLOCKQUOTE'],
    ['- ', 'UL'],
    ['1. ', 'OL'],
  ] as const) {
    test(`"${typed}" 규칙 뒤 한글 조합이 끝난 본문은 블록 안에 들어가고, 규칙 직후 Backspace는 원문으로 돌아간다`, async ({ page }) => {
      const { editor, cdp } = await openEditor(page);

      await page.keyboard.type(typed);
      await page.keyboard.press('Backspace');
      expect(await firstBlock(editor)).toEqual({ tag: 'P', text: typed });

      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await page.keyboard.type(typed);
      await typeKorean(page, cdp, '제목');

      await expect(editor.locator(tag.toLowerCase()).first()).toContainText('제목');
      if (typed === '# ') await shoot(page, 'ime-heading');
    });
  }

  test('"---" 규칙은 한글 문장 다음 줄에서도 구분선을 만들고 아래 빈 문단에 한글을 이어 쓸 수 있다', async ({ page }) => {
    const { editor, cdp } = await openEditor(page);
    await typeKorean(page, cdp, '안녕하세요');
    await page.keyboard.press('Enter');

    await page.keyboard.type('---');
    await expect(editor.locator('hr')).toHaveCount(1);
    await typeKorean(page, cdp, '아래');

    await expect(editor.locator('p').last()).toHaveText('아래');
    await shoot(page, 'ime-hr');
  });

  test('"---" 직후 Backspace 한 번이면 한글 문장 다음 줄에서도 원문으로 돌아간다', async ({ page }) => {
    const { editor, cdp } = await openEditor(page);
    await typeKorean(page, cdp, '안녕하세요');
    await page.keyboard.press('Enter');
    await page.keyboard.type('---');
    await expect(editor.locator('hr')).toHaveCount(1);

    await page.keyboard.press('Backspace');

    await expect(editor.locator('hr')).toHaveCount(0);
    await expect(editor.locator('p').nth(1)).toHaveText('---');
  });

  for (const [open, tag, word] of [
    ['**', 'strong', '굵게'],
    ['*', 'em', '기울임'],
  ] as const) {
    test(`${open}${word}${open}: 한글 조합 직후 닫는 기호를 입력하면 서식이 적용되고 Backspace 한 번이면 원문으로 돌아간다`, async ({ page }) => {
      const { editor, cdp } = await openEditor(page);

      await page.keyboard.type(open);
      await typeKorean(page, cdp, word);
      await page.keyboard.type(open);

      await expect(editor.locator(tag)).toHaveText(word);
      await shoot(page, `ime-${tag}`);

      await page.keyboard.press('Backspace');
      await expect(editor.locator(tag)).toHaveCount(0);
      await expect(editor.locator('p').first()).toHaveText(`${open}${word}${open}`);
    });
  }

  test('조합을 취소해도(조합 문자열을 비워도) 이미 적용된 제목 블록이 풀리지 않는다', async ({ page }) => {
    const { editor, cdp } = await openEditor(page);
    await page.keyboard.type('# ');

    await cdp.send('Input.imeSetComposition', { text: 'ㅈ', selectionStart: 1, selectionEnd: 1 });
    await cdp.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 });

    await expect(editor.locator('h1')).toHaveCount(1);
  });
});
