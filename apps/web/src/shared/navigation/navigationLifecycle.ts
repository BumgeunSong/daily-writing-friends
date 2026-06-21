/**
 * 라우트 전환 생애주기 — 한 라우트 전환이 화면에 일으키는 부작용을 한 곳에서 다룬다.
 *
 * 다루는 두 가지:
 * 1. `data-transition` 속성 (forward/back) — index.css의 ::view-transition-old/new(root)
 *    규칙이 이 속성으로 슬라이드 방향을 결정한다. 트랜지션 종료 후 자동 제거.
 * 2. 스크롤 방향 감지 침묵 — RR <ScrollRestoration />이 라우트 마운트 직후
 *    동기적으로 window.scrollTo를 호출하는데, useScrollDirection이 이것을
 *    사용자 "아래로" 스크롤로 오해해 하단 내비를 숨기는 것을 막는다.
 *
 * 두 부작용 모두 HOLD_MS 동안만 유효하고 같은 타이밍으로 정리된다. 이 모듈을 읽으면
 * 한 라우트 전환이 일으키는 부작용의 전체 그림을 한 화면에 볼 수 있다.
 */

type Direction = 'forward' | 'back';

// 280ms 페이지 트랜지션 애니메이션 + RR의 ScrollRestoration 페인트 여유 + 코드 분할
// 청크 페치 마진을 합한 단일 보유 시간.
const HOLD_MS = 600;

let attributeToken = 0;
let suppressUntilTimestamp = 0;

function setDirectionAttribute(direction: Direction): void {
  document.documentElement.dataset.transition = direction;
  const token = ++attributeToken;
  window.setTimeout(() => {
    if (attributeToken === token) {
      delete document.documentElement.dataset.transition;
    }
  }, HOLD_MS);
}

function extendSuppressionWindow(durationMs: number): void {
  const until = Date.now() + durationMs;
  if (until > suppressUntilTimestamp) suppressUntilTimestamp = until;
}

// 우리 back()가 막 호출되었음을 popstate 리스너에 알리는 플래그. popstate가 우리
// navigate(-1)에서 비롯되었는지(슬라이드 유지) 아니면 브라우저/iOS 스와이프에서
// 비롯되었는지(잔여 방향 제거) 구분하기 위함.
let isOurNextPopIntentional = false;

/** Tag the next route change as a forward (deeper) navigation. */
export function markForwardNavigation(): void {
  setDirectionAttribute('forward');
  extendSuppressionWindow(HOLD_MS);
}

/** Tag the next route change as a back (shallower) navigation. */
export function markBackNavigation(): void {
  isOurNextPopIntentional = true;
  setDirectionAttribute('back');
  extendSuppressionWindow(HOLD_MS);
}

/** True while a programmatic scroll caused by a recent navigation should be ignored. */
export function isScrollDirectionSuppressed(): boolean {
  return Date.now() < suppressUntilTimestamp;
}

// 브라우저가 시작한 pop (iOS 가장자리 스와이프 백, 데스크톱 백 버튼)도 동일하게
// 프로그래매틱 스크롤을 유발하므로 같은 창으로 침묵시킨다. extendSuppressionWindow는
// idempotent라 우리 forward/back 헬퍼와 중복 호출되어도 안전.
//
// 또한 잔여 'forward' 방향 속성이 남은 상태에서 사용자가 스와이프하면 그 pop에 대해
// view transition이 잘못된 방향으로 슬라이드를 그려 버린다. markBackNavigation()이
// 직전 호출되어 의도된 pop인 경우에만 속성을 유지하고, 그 외에는 비운다.
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    extendSuppressionWindow(HOLD_MS);
    if (isOurNextPopIntentional) {
      isOurNextPopIntentional = false;
      return;
    }
    delete document.documentElement.dataset.transition;
  });
}
