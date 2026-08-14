import { assertEquals } from 'jsr:@std/assert@1';
import {
  contentPreviewText,
  extractMentionUserIds,
  extractPlainText,
  htmlToPlainText,
} from './extractMentions.ts';

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

Deno.test('htmlToPlainText', async (t) => {
  await t.step('단일 문단의 <p> 태그를 벗겨낸다', () => {
    assertEquals(
      htmlToPlainText('<p>진짜 번역 제목 보면 한숨나오는 거 많음..ㅋㅋ</p>'),
      '진짜 번역 제목 보면 한숨나오는 거 많음..ㅋㅋ',
    );
  });

  await t.step('문단 경계와 <br>은 공백으로 합쳐 한 줄로 만든다', () => {
    assertEquals(htmlToPlainText('<p>첫 줄</p><p>둘째 줄</p>'), '첫 줄 둘째 줄');
    assertEquals(htmlToPlainText('첫 줄<br>둘째 줄'), '첫 줄 둘째 줄');
  });

  await t.step('중첩 태그와 속성이 있어도 텍스트만 남긴다', () => {
    assertEquals(
      htmlToPlainText('<p>안녕 <strong>여러분</strong> <a href="http://x">링크</a></p>'),
      '안녕 여러분 링크',
    );
  });

  await t.step('HTML 엔티티를 디코딩하되 &amp;는 마지막에 처리한다', () => {
    assertEquals(htmlToPlainText('<p>A &amp; B</p>'), 'A & B');
    assertEquals(htmlToPlainText('<p>&lt;p&gt; 는 태그</p>'), '<p> 는 태그');
    // 사용자가 문자 그대로 입력한 &lt; 는 재해석되지 않는다
    assertEquals(htmlToPlainText('<p>&amp;lt;</p>'), '&lt;');
  });

  await t.step('script/style은 본문 텍스트까지 통째로 제거한다', () => {
    assertEquals(htmlToPlainText('<style>.a{color:red}</style><p>본문</p>'), '본문');
    assertEquals(htmlToPlainText('<script>alert("x")</script>안녕'), '안녕');
    assertEquals(htmlToPlainText('<script>if (1 < 2) f()</script>진짜 본문'), '진짜 본문');
  });

  await t.step('태그가 없는 평문은 그대로 통과한다', () => {
    assertEquals(htmlToPlainText('그냥 평범한 댓글'), '그냥 평범한 댓글');
  });

  await t.step('빈 값/문자열 아님이면 빈 문자열', () => {
    assertEquals(htmlToPlainText(''), '');
    assertEquals(htmlToPlainText(null as unknown as string), '');
    assertEquals(htmlToPlainText(undefined as unknown as string), '');
  });
});

Deno.test('contentPreviewText', async (t) => {
  await t.step('content_json이 있으면 평문화 경로를 쓴다', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '제이슨 본문' }] }],
    };
    assertEquals(contentPreviewText(doc, '<p>무시되는 HTML</p>'), '제이슨 본문');
  });

  await t.step('content_json이 없으면 레거시 HTML에서 태그를 벗긴다', () => {
    assertEquals(contentPreviewText(null, '<p>레거시 댓글</p>'), '레거시 댓글');
    assertEquals(contentPreviewText(undefined, '<p>레거시 댓글</p>'), '레거시 댓글');
  });

  await t.step('둘 다 없으면 빈 문자열', () => {
    assertEquals(contentPreviewText(null, null), '');
    assertEquals(contentPreviewText(null, undefined), '');
  });
});
