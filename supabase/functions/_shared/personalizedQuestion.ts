export type SourceType = 'just-three' | 'regular';

export const QUESTION_MODEL = 'claude-sonnet-5-5';
export const MAX_BODY_CHARS = 3000;

export const QUESTION_JSON_FORMAT = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: { question: { type: ['string', 'null'] } },
    required: ['question'],
    additionalProperties: false,
  },
} as const;

/**
 * 블록 경계는 줄바꿈으로 보존하면서 태그를 제거한다. 3줄쓰기 글 판별이
 * "첫 비어 있지 않은 줄"에 의존하므로 줄 구조를 잃으면 안 된다.
 * 안정될 때까지 반복해 `<<b>b>` 같은 재조립 입력도 지운다.
 */
export function stripHtmlKeepingLines(html: string): string {
  let stripped = html;
  let previous: string;
  do {
    previous = stripped;
    stripped = stripped
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '');
  } while (stripped !== previous);
  return stripped
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export function detectSourceType(content: string): SourceType {
  const firstLine = stripHtmlKeepingLines(content)
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line !== '');
  return firstLine !== undefined && /^Q[.:]/.test(firstLine) ? 'just-three' : 'regular';
}

const BASE_SYSTEM_PROMPT = `당신은 글쓰기 모임 앱의 질문 작가입니다. 사용자가 최근에 쓴 글을 읽고, 그 사람이 가볍게 이어서 답해볼 수 있는 후속 질문을 하나 만듭니다.

규칙:
1. 질문은 한국어 한 문장, 40자 이내로 씁니다.
2. 사실 확인이 아니라 그때의 감정, 이유, 경험을 묻습니다.
3. 30자 안팎의 짧은 답이면 충분해야 합니다. 거창하거나 무거운 질문, 자기 성찰을 강요하는 질문은 피합니다.
4. 무엇이에요, 왜 같은 질문보다 언제, 어떤 순간, 어떤 기분처럼 장면을 떠올리며 답할 수 있는 열린 질문을 씁니다. 예/아니오로 답하는 질문은 쓰지 않습니다.
5. 질문 안에 그 글의 구체적인 상황을 짧게 넣어서, 질문만 읽어도 어떤 장면인지 떠올릴 수 있게 합니다.
6. 글의 핵심이 아닌 곁가지나, 너무 넓어서 한 번에 답하기 어려운 질문은 피합니다.
7. 글에 없는 사실을 가정하지 않습니다. 글과 상관없이 누구에게나 할 수 있는 질문도 쓰지 않습니다.
8. 글을 평가하거나 조언하지 않습니다.
9. 정말로 물을 만한 내용이 없을 때만 question을 null로 합니다.

좋은 예: 고향에 내려가 엄마와 산책로를 걸을 때, 어떤 마음이 들었어요?
나쁜 예: 그 결정의 밑바닥에 있는 두려움을 어떻게 마주했나요?`;

const REGULAR_ADDENDUM = '글 전체에서 감정이나 동기가 가장 드러난 부분 하나를 골라 묻습니다.';

const JUST_THREE_ADDENDUM = `아래는 짧은 질문 3개에 대한 한 줄 답변입니다. 이야기가 더 있어 보이는 답변 하나를 골라, 그 답변을 풀어낼 수 있는 질문을 만듭니다.

예: "Q. 오늘 가장 편했던 순간은? > 퇴근 후 샤워"에 대한 좋은 질문: 샤워하는 동안엔 어떤 생각이 제일 자주 떠올라요?`;

export function buildSystemPrompt(sourceType: SourceType): string {
  const addendum = sourceType === 'just-three' ? JUST_THREE_ADDENDUM : REGULAR_ADDENDUM;
  return `${BASE_SYSTEM_PROMPT}\n\n${addendum}`;
}

export function buildUserMessage(
  post: { title: string; content: string },
  sourceType: SourceType,
): string {
  const plainBody =
    sourceType === 'just-three' ? post.content : stripHtmlKeepingLines(post.content);
  const body = plainBody.trim().slice(0, MAX_BODY_CHARS);
  return `제목: ${post.title}\n\n본문:\n${body}`;
}

interface MessageLike {
  stop_reason?: string | null;
  content?: ReadonlyArray<{ type: string; text?: string }>;
}

/**
 * LLM 응답에서 질문을 꺼낸다. 질문 없음은 null.
 * `<`, `>`는 제거한다: 질문은 post content의 `Q. …` 줄로 들어가고, 이 문자가
 * 남으면 isHtmlContent 판별이 오작동한다. 품질 판단이 아니라 형식 안전 규칙이다.
 */
export function parseQuestion(response: MessageLike): string | null {
  if (response.stop_reason !== 'end_turn') return null;

  const textBlock = response.content?.find((block) => block.type === 'text');
  if (textBlock?.text === undefined) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    return null;
  }

  const question = (parsed as { question?: unknown } | null)?.question;
  if (typeof question !== 'string') return null;

  const cleaned = question.replace(/[<>]/g, '').trim();
  return cleaned === '' ? null : cleaned;
}
