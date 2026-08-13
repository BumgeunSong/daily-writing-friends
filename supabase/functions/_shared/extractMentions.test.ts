import { assertEquals } from 'jsr:@std/assert@1';
import { extractMentionUserIds, extractPlainText } from './extractMentions.ts';

Deno.test('extractMentionUserIds', async (t) => {
  await t.step('멘션이 없으면 빈 배열', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '안녕하세요' }] }],
    };
    assertEquals(extractMentionUserIds(doc), []);
  });

  await t.step('멘션 1개면 해당 user_id 1개', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '안녕 ' },
            { type: 'mention', attrs: { id: 'user-1', label: '홍길동' } },
          ],
        },
      ],
    };
    assertEquals(extractMentionUserIds(doc), ['user-1']);
  });

  await t.step('같은 사람을 여러 번 멘션하면 1개로 병합', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'mention', attrs: { id: 'user-1', label: '홍길동' } },
            { type: 'text', text: ' 그리고 다시 ' },
            { type: 'mention', attrs: { id: 'user-1', label: '홍길동' } },
          ],
        },
      ],
    };
    assertEquals(extractMentionUserIds(doc), ['user-1']);
  });

  await t.step('여러 문단에 걸친 서로 다른 멘션을 모두 수집', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'mention', attrs: { id: 'user-1', label: '홍길동' } }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'mention', attrs: { id: 'user-2', label: '김철수' } }],
        },
      ],
    };
    assertEquals(extractMentionUserIds(doc), ['user-1', 'user-2']);
  });

  await t.step('attrs.id가 없는 멘션 노드는 무시', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'mention', attrs: { label: '이름만' } }],
        },
      ],
    };
    assertEquals(extractMentionUserIds(doc), []);
  });

  await t.step('null/문자열 등 문서가 아니면 빈 배열', () => {
    assertEquals(extractMentionUserIds(null), []);
    assertEquals(extractMentionUserIds('not a doc'), []);
    assertEquals(extractMentionUserIds(undefined), []);
  });
});

Deno.test('extractPlainText', async (t) => {
  await t.step('텍스트 노드만 이어붙인다', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '오늘 ' },
            { type: 'text', text: '날씨 좋다' },
          ],
        },
      ],
    };
    assertEquals(extractPlainText(doc), '오늘 날씨 좋다');
  });

  await t.step('멘션은 @label로 평문화한다', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'mention', attrs: { id: 'user-1', label: '홍길동' } },
            { type: 'text', text: ' 이것 좀 봐줘' },
          ],
        },
      ],
    };
    assertEquals(extractPlainText(doc), '@홍길동 이것 좀 봐줘');
  });

  await t.step('label이 없으면 @id로 평문화한다', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'mention', attrs: { id: 'user-1' } }] }],
    };
    assertEquals(extractPlainText(doc), '@user-1');
  });

  await t.step('여러 문단은 공백으로 구분해 이어붙인다', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '첫 문단' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '둘째 문단' }] },
      ],
    };
    assertEquals(extractPlainText(doc), '첫 문단 둘째 문단');
  });

  await t.step('null/문서 아님이면 빈 문자열', () => {
    assertEquals(extractPlainText(null), '');
    assertEquals(extractPlainText('not a doc'), '');
  });
});
