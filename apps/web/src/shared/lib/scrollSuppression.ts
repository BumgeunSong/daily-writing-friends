/**
 * 프로그래매틱 스크롤(예: 라우트 전환 직후의 스크롤 복원)이 useScrollDirection의
 * "사용자가 아래로 스크롤했다"는 판정을 잘못 발동시키지 않도록, 짧은 시간 창을
 * 두어 스크롤 방향 감지를 침묵시킨다.
 *
 * NavigationContext가 로케이션 변경 시점에 suppressScrollDirectionFor()를 호출하고,
 * useScrollDirection은 isScrollDirectionSuppressed()가 true인 동안 baseline만
 * 조용히 갱신하고 방향 변경 이벤트를 발행하지 않는다.
 */

let suppressUntil = 0;

export function suppressScrollDirectionFor(ms: number): void {
  const until = Date.now() + ms;
  if (until > suppressUntil) suppressUntil = until;
}

export function isScrollDirectionSuppressed(): boolean {
  return Date.now() < suppressUntil;
}
