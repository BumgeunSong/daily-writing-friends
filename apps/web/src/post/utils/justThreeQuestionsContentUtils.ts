export interface JustThreeQuestionAnswer {
  question: string;
  answer: string;
}

/**
 * `<`, `>`를 남기면 contentUtils.ts의 isHtmlContent 정규식이 오작동해
 * 줄바꿈 변환이 스킵되거나 마크업으로 렌더링될 수 있다. 답변은 30자 제한
 * 텍스트라 제거해도 의미 손실이 거의 없다. question은 admin이 저장하는
 * 외부 입력이라 같은 위험이 있어 동일하게 제거한다.
 */
export function removeAngleBrackets(text: string): string {
  return text.replace(/[<>]/g, '');
}

export function formatJustThreeQuestionsContent(qaPairs: readonly JustThreeQuestionAnswer[]): string {
  return qaPairs
    .map(
      ({ question, answer }) =>
        `Q. ${removeAngleBrackets(question)} > ${removeAngleBrackets(answer)}`,
    )
    .join('\n\n');
}
