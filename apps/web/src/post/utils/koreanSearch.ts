/** 받침(종성) 자모 -> 같은 자음의 초성. 겹받침은 초성이 될 수 없어 제외한다. */
const FINAL_TO_INITIAL: Record<string, string> = {
  'ᆨ': 'ᄀ', // ㄱ
  'ᆩ': 'ᄁ', // ㄲ
  'ᆫ': 'ᄂ', // ㄴ
  'ᆮ': 'ᄃ', // ㄷ
  'ᆯ': 'ᄅ', // ㄹ
  'ᆷ': 'ᄆ', // ㅁ
  'ᆸ': 'ᄇ', // ㅂ
  'ᆺ': 'ᄉ', // ㅅ
  'ᆻ': 'ᄊ', // ㅆ
  'ᆼ': 'ᄋ', // ㅇ
  'ᆽ': 'ᄌ', // ㅈ
  'ᆾ': 'ᄎ', // ㅊ
  'ᆿ': 'ᄏ', // ㅋ
  'ᇀ': 'ᄐ', // ㅌ
  'ᇁ': 'ᄑ', // ㅍ
  'ᇂ': 'ᄒ', // ㅎ
};

/** NFKD는 호환 자모(ㅈ)를 초성 자모로 펼쳐, 조합 중 단독 자음도 음절의 초성과 비교할 수 있게 한다. 영문은 소문자로 맞춘다. */
const toJamo = (text: string) => text.normalize('NFKD').toLowerCase();

/**
 * 조합 중인 마지막 음절의 받침은 사실 다음 음절의 초성일 수 있다(젬 -> 제목).
 * 마지막 자모가 받침이면 초성으로 바꾼 변형을 돌려준다.
 */
function withTrailingFinalAsInitial(jamo: string): string {
  const last = jamo.at(-1);
  const initial = last ? FINAL_TO_INITIAL[last] : undefined;
  return initial ? jamo.slice(0, -1) + initial : jamo;
}

/**
 * 한글 IME 조합 중에도 깨지지 않는 부분 일치 검사.
 * 자모 단위 부분 문자열 일치. 받침이 빠졌거나 받침이 다음 음절 초성이 될 미완성 음절(젬, ㅈ)이 완성 단어(제목)에 걸린다.
 */
export function matchesKoreanQuery(target: string, query: string): boolean {
  const targetJamo = toJamo(target);
  const queryJamo = toJamo(query);
  return (
    targetJamo.includes(queryJamo) ||
    targetJamo.includes(withTrailingFinalAsInitial(queryJamo))
  );
}
