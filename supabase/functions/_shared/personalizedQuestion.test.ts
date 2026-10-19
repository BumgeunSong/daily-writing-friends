import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import {
  buildSystemPrompt,
  buildUserMessage,
  detectSourceType,
  parseQuestion,
  stripHtmlKeepingLines,
} from './personalizedQuestion.ts';

Deno.test('글 본문에서 HTML을 걷어낼 때', async (t) => {
  const cases = [
    { caseName: '문단 경계는 줄바꿈으로 남긴다', html: '<p>a</p><p>b</p>', expected: 'a\nb\n' },
    { caseName: 'br은 줄바꿈이 된다', html: 'a<br>b', expected: 'a\nb' },
    { caseName: 'script 요소는 내용째 지운다', html: 'a<script>alert(1)</script>b', expected: 'a\nb' },
    { caseName: 'HTML 엔티티는 원래 문자로 되돌린다', html: 'a&nbsp;&lt;b&gt;&amp;', expected: 'a <b>&' },
    { caseName: '태그가 없는 평문은 그대로 둔다', html: 'Q. 질문 > 답', expected: 'Q. 질문 > 답' },
  ];
  for (const { caseName, html, expected } of cases) {
    await t.step(caseName, () => {
      assertEquals(stripHtmlKeepingLines(html), expected);
    });
  }
});

Deno.test('글이 3줄쓰기에서 나왔는지 판별할 때', async (t) => {
  const cases = [
    { caseName: '평문 Q. 줄로 시작하면 3줄쓰기 글이다', content: 'Q. 오늘은? > 맑음\n\nQ. 내일은? > 흐림', expected: 'just-three' },
    { caseName: '직접 쓴 Q: 변형도 3줄쓰기 글이다', content: 'Q: 오늘은?\nA: 맑음', expected: 'just-three' },
    { caseName: '앞쪽 공백과 HTML 태그가 있어도 3줄쓰기 글이다', content: '  \n<p>Q. 오늘은? &gt; 맑음</p>', expected: 'just-three' },
    { caseName: '빈 문단이 앞서도 3줄쓰기 글이다', content: '<p></p><p>Q. 오늘은?</p>', expected: 'just-three' },
    { caseName: '본문 중간에 Q.가 나와도 일반 글이다', content: '<p>오늘은 Q. 이야기를 했다</p>', expected: 'regular' },
    { caseName: 'Q로 시작해도 점이나 콜론이 없으면 일반 글이다', content: 'Question about life', expected: 'regular' },
    { caseName: '빈 글은 일반 글이다', content: '', expected: 'regular' },
  ];
  for (const { caseName, content, expected } of cases) {
    await t.step(caseName, () => {
      assertEquals(detectSourceType(content), expected);
    });
  }
});

Deno.test('질문 작성 지침을 만들 때', async (t) => {
  await t.step('일반 글에도 질문 없음은 물을 게 없을 때만 허용한다고 알린다', () => {
    assertStringIncludes(buildSystemPrompt('regular'), '정말로 물을 만한 내용이 없을 때만');
  });

  await t.step('3줄쓰기 글에도 질문 없음은 물을 게 없을 때만 허용한다고 알린다', () => {
    assertStringIncludes(buildSystemPrompt('just-three'), '정말로 물을 만한 내용이 없을 때만');
  });

  await t.step('일반 글은 감정이나 동기가 드러난 부분을 고르게 한다', () => {
    assertStringIncludes(buildSystemPrompt('regular'), '감정이나 동기가 가장 드러난 부분');
  });

  await t.step('3줄쓰기 글은 한 줄 답변 중 하나를 풀어내게 한다', () => {
    assertStringIncludes(buildSystemPrompt('just-three'), '한 줄 답변');
  });
});

Deno.test('모델에 보낼 글을 구성할 때', async (t) => {
  await t.step('일반 글은 태그를 걷어낸 본문을 제목과 함께 보낸다', () => {
    assertEquals(
      buildUserMessage({ title: '제목', content: '<p>본문</p>' }, 'regular'),
      '제목: 제목\n\n본문:\n본문',
    );
  });

  await t.step('3줄쓰기 글은 평문 그대로 보낸다', () => {
    assertEquals(
      buildUserMessage({ title: '제목', content: 'Q. 질문 > 답' }, 'just-three'),
      '제목: 제목\n\n본문:\nQ. 질문 > 답',
    );
  });

  await t.step('본문은 3000자까지만 보낸다', () => {
    const message = buildUserMessage({ title: 't', content: 'a'.repeat(3500) }, 'regular');
    assertEquals(message.length, 3011);
  });
});

Deno.test('모델 응답에서 질문을 꺼낼 때', async (t) => {
  await t.step('정상 응답이면 질문을 돌려준다', () => {
    assertEquals(
      parseQuestion({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: '{"question":"그때 어떤 기분이었어요?"}' }],
      }),
      '그때 어떤 기분이었어요?',
    );
  });

  await t.step('thinking 블록이 앞서도 text 블록에서 질문을 찾는다', () => {
    assertEquals(
      parseQuestion({
        stop_reason: 'end_turn',
        content: [{ type: 'thinking' }, { type: 'text', text: '{"question":"질문?"}' }],
      }),
      '질문?',
    );
  });

  const noQuestionCases = [
    { caseName: '출력이 잘리면 질문 없음이다', response: { stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"question":"q"}' }] } },
    { caseName: '모델이 거부하면 질문 없음이다', response: { stop_reason: 'refusal', content: [{ type: 'text', text: '{"question":"q"}' }] } },
    { caseName: 'JSON이 아니면 질문 없음이다', response: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'not json' }] } },
    { caseName: '모델이 null을 돌려주면 질문 없음이다', response: { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"question":null}' }] } },
    { caseName: '공백뿐인 질문은 질문 없음이다', response: { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"question":"   "}' }] } },
    { caseName: '문자열이 아닌 질문은 질문 없음이다', response: { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"question":3}' }] } },
    { caseName: 'JSON null 응답은 질문 없음이다', response: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'null' }] } },
    { caseName: 'text 블록이 없으면 질문 없음이다', response: { stop_reason: 'end_turn', content: [] } },
    { caseName: '꺾쇠만 있는 질문은 지우고 나면 비어 질문 없음이다', response: { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"question":"<>"}' }] } },
  ];
  for (const { caseName, response } of noQuestionCases) {
    await t.step(caseName, () => {
      assertEquals(parseQuestion(response), null);
    });
  }

  await t.step('꺾쇠는 지워서 post content의 HTML 판별을 해치지 않는다', () => {
    assertEquals(
      parseQuestion({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: '{"question":"<b>왜</b> 그랬어요?"}' }],
      }),
      'b왜/b 그랬어요?',
    );
  });
});
