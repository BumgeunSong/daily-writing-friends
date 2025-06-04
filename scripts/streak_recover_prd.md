# Streak Recovery 기능 PRD

---

## 1. 목적
- 사용자가 평일(working day)에 글을 작성하지 않아 끊긴 streak를, 다음 working day에 2개의 글을 작성함으로써 1회에 한해 복구할 수 있도록 한다.
- streak 유지에 대한 동기부여와 재도전 기회를 제공한다.

---

## 2. 정책 및 정의

### 2.1 Streak Miss 및 Recovery 조건
- 사용자가 working day(월~금)에 글을 작성하지 않으면 streak가 끊긴다.
- streak가 끊긴 다음 working day(예: 목요일에 놓치면 금요일, 금요일에 놓치면 다음 월요일)에만 복구 기회가 주어진다.
- 복구 기회는 1회에 한해 제공된다. (여러 날 연속으로 놓친 경우 복구 불가)
- 복구 기회가 주어진 날(복구 기간)에는 2개의 글을 작성해야 streak가 복구된다.
- 복구 기간이 지나면(예: 금요일 놓치고 월요일까지 복구 안 하면) 복구 불가.
- 주말/공휴일은 streak 계산에서 제외되나, 금요일 놓친 streak는 주말(토/일)에 2개 글 작성해도 복구 가능.

### 2.2 Streak 계산 및 처리
- streak는 working day 기준으로 계산한다.
- 복구 성공 시, streak는 기존과 동일하게 취급한다. (badge, 통계 등 동일)
- 복구 내역은 별도 기록하지 않는다.

---

## 3. 데이터 모델 (Firestore)
- 별도의 스키마 변경 없이 기존 posting 기록만 활용
  - users/{userId}/postings/{postingId}
    - 각 posting에는 createdAt(Firestore Timestamp), authorId == userId 필요

---

## 4. 시간/날짜 처리
- working days = 월~금 (한국 공휴일 제외는 추후 확장)
- 타임존: Asia/Seoul (luxon 또는 Intl.DateTimeFormat 활용)
- "오늘", "어제" 등은 항상 KST 기준

---

## 5. Streak 유틸리티 로직 (streakUtils.ts)

### 5.1 주요 함수
| 함수명 | 목적 |
|---|---|
| isWorkingDay(date: Date): boolean | 해당 날짜가 working day인지 판별 |
| getPreviousWorkingDay(date: Date): Date | 이전 working day 반환 |
| getPostingDaysSet(postings: Posting[]): Set<string> | posting을 YYYY-MM-DD key로 변환 |
| getRecoveryStatus(today: Date, postingDays: Set<string>): RecoveryStatus | streak 복구 가능 여부 및 상태 반환 |

#### RecoveryStatus 타입
- 'none' : 복구 대상 아님
- 'eligible' : 복구 기회 있음(2개 글 작성 필요)
- 'partial' : 1개만 작성됨(1개 더 필요)
- 'success' : 복구 성공(2개 작성 완료)

#### getRecoveryStatus 예시 구현
```typescript
function getRecoveryStatus(postingDays: Set<string>, today: Date): RecoveryStatus {
  const todayKey = getDateKey(today);
  const yesterday = getPreviousWorkingDay(today);
  const yesterdayKey = getDateKey(yesterday);

  const missedYesterday = !postingDays.has(yesterdayKey);
  const todayCount = [...postingDays].filter(k => k === todayKey).length;

  if (!missedYesterday) return 'none';
  if (todayCount >= 2) return 'success';
  if (todayCount === 1) return 'partial';
  return 'eligible';
}
```

---

## 6. 프론트엔드 (React)

### 6.1 UI 동작
- 컴포넌트: `<RecoveryBanner />`
- getRecoveryStatus(...)가 'eligible', 'partial', 'success'일 때만 노출
- 상태별 배너 메시지:

| Status   | Banner Text |
|----------|------------------------------------------------------|
| eligible | "어제 streak를 놓쳤어요! 오늘 2개의 글을 작성하면 streak를 복구할 수 있어요." |
| partial  | "1/2 완료 — 1개 더 작성하면 streak가 복구됩니다!" |
| success  | "연속 X일로 복구되었어요!" |
| none     | 배너 미노출 |

### 6.2 클라이언트 플로우
1. BoardPage 진입 시 userId 로드
2. 최근 10개 이상 working day의 posting fetch
3. postingDays: Set<string> 생성
4. getRecoveryStatus(today, postingDays)로 상태 판별
5. <RecoveryBanner /> 조건부 렌더링

---

## 7. Streak 계산 로직
- streak는 항상 동적으로 계산
- 복구 성공 시(오늘이 recovery day이고 2개 글 작성), streak 계산 시 어제 글을 쓴 것으로 간주하여 연속 streak 유지
- 별도 streak 필드 저장 불필요

---

## 8. 확장성 및 Future Hooks
- RecoveryContext 등 도입 시 확장 가능
  - 예: logRecoveryEvent(userId, status)로 analytics 기록
  - badge, UI 애니메이션, 오프라인 포스팅 재시도 등

---

## 9. 예시 시나리오

### 9.1 정상 복구
- 목요일 글 미작성 → 금요일 2개 글 작성 → streak 복구
- 금요일 글 미작성 → 토/일/월 중 2개 글 작성 → streak 복구

### 9.2 복구 실패
- 목요일 글 미작성 → 금요일 1개만 작성 → 복구 실패, streak 초기화
- 금요일 글 미작성 → 토/일/월 모두 2개 글 미작성 → 복구 실패, streak 초기화

---

## 10. 참고/추가 구현 노트
- RecoveryStatus, getRecoveryStatus 등은 streakUtils.ts에 구현
- RecoveryBanner는 boardPage에서만 노출
- streak badge, 통계 등은 기존 로직과 동일하게 처리
- 복구 내역 별도 저장/조회는 추후 확장 가능 