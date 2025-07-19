# Streak Recovery 기능 PRD

---

## 1. 목적

- 사용자가 평일(working day)에 글을 작성하지 않아 끊긴 streak를, 다음 working day에 2개의 글을 작성함으로써 1회에 한해 복구할 수 있도록 한다.
- streak 유지에 대한 동기부여와 재도전 기회를 제공한다.

---

## 2. 정책 및 정의

### 2.1 Streak Miss 및 Recovery 조건

- 사용자가 working day(월~금)에 글을 작성하지 않으면 streak가 끊긴다.
- streak가 끊긴 순간부터, 다음 Working Day까지만 복구가 가능한 기간이다. 월요일에 글을 놓친 경우 화요일이 복구 기간, 금요일에 놓친 경우, 토,일,월요일이 복구 기간이다.
- 복구 기회는 1회에 한해 제공된다. (여러 날 연속으로 놓친 경우 복구 불가)
- 복구 기회가 주어진 날에는 1번째 글을 작성하면, 평상시와 똑같이 당일의 글로 인정된다. (이 때 RecoveryStatus는 eligible -> partial이 된다)
- 하지만 2번째로 글을 작성하면 (즉, RecoveryStatus가 partial 인 상태에서 작성하면), postings collection에 글을 놓친 날에 작성한 글(posting)로 저장되며, 결과적으로 끊겼던 streak가 복구된다. (RecoveryStatus는 partial -> success가 된다)
- 복구 기간이 지나면(예: 금요일 놓치고 월요일까지 복구 안 하면) 복구 불가.
- 원래 주말/공휴일은 streak 계산에서 제외되나, 금요일 놓친 streak는 주말(토/일)에 2개 글 작성해도 복구 가능.

### 2.2 Streak 계산 및 처리

- streak는 working day 기준으로 계산한다.
- 복구 성공 시, streak는 기존과 동일하게 취급한다. (badge, 통계 등 동일)
- 복구 내역은 별도 기록하지 않는다.

---

## 3. 데이터 모델 (Firestore)

- 별도의 스키마 변경 없이 기존 posting 기록만 활용
  - users/{userId}/postings/{postingId}
    - 각 posting에는 createdAt(Firestore Timestamp), authorId == userId 필요
  - 만약 복구 기간에 2번째 글을 써서 posting이 생긴 경우, posting에는 document에 'isRecovered (Bool)' 을 true 로 추가한다.

---

## 4. 시간/날짜 처리

- working days = 월~금 (한국 공휴일 제외는 추후 확장)
- 타임존: Asia/Seoul (luxon 또는 Intl.DateTimeFormat 활용)
- "오늘", "어제" 등은 항상 KST 기준

---

## 5. Streak 유틸리티 로직 (streakUtils.ts)

### 5.1 주요 함수

| 함수명                                                                   | 목적                               |
| ------------------------------------------------------------------------ | ---------------------------------- |
| isWorkingDay(date: Date): boolean                                        | 해당 날짜가 working day인지 판별   |
| getPreviousWorkingDay(date: Date): Date                                  | 이전 working day 반환              |
| getPostingDaysSet(postings: Posting[]): Set<string>                      | posting을 YYYY-MM-DD key로 변환    |
| getRecoveryStatus(today: Date, postingDays: Set<string>): RecoveryStatus | streak 복구 가능 여부 및 상태 반환 |

#### RecoveryStatus 타입

- 'none' : 복구 대상/기간 아님
- 'eligible' : 복구 기회 있음(2개 글 작성 필요)
- 'partial' : 1개만 작성됨(1개 더 필요)
- 'success' : 복구 성공(2개 작성 완료)

---

## 6. 프론트엔드 (React)

### 6.1 UI 동작

- 컴포넌트: `<SystemPostCard>`
- getRecoveryStatus(...)가 'eligible', 'partial', 'success'일 때만 노출
- 상태별 배너 메시지:

| Status   | SystemPostCard title    | SystemPostCard content                                  |
| -------- | ----------------------- | ------------------------------------------------------- | ------ |
| eligible | 어제 streak를 놓쳤어요! | 오늘 2개의 글을 작성하면 연속 일수를 복구할 수 있어요." |
| partial  | 1/2 완료                | 1개 더 작성하면 streak가 복구돼요!                      |
| success  | 복구 성공!              | 연속 X일로 복구되었어요.                                | 미노출 |
| none     | 미노출                  | 미노출                                                  |

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

---

## 8. Recovery Status 전환 로직

### 8.1 상태 전환 알고리즘

Recovery Status는 다음 로직에 따라 계산됩니다:

```typescript
// 1. 이전 working day에 posting이 있는지 확인
if (hasPreviousWorkingDayPosting) {
  return 'none'; // 복구 필요 없음
}

// 2. 연속으로 여러 working day를 놓쳤는지 확인
if (hasMissedMultipleWorkingDays) {
  return 'none'; // 복구 불가 (연속 miss)
}

// 3. 단일 working day miss의 경우, 오늘 posting 수에 따라 결정
if (todayPostingsCount === 0) return 'eligible';
if (todayPostingsCount === 1) return 'partial';
if (todayPostingsCount >= 2) return 'success';
```

### 8.2 Midnight Function 동작

매일 00:00 KST에 실행되는 `updateRecoveryStatusOnMidnight` 함수는:

1. **모든 사용자의 Recovery Status를 재계산**
2. **복구 기간 만료 처리**: `'partial'` 또는 `'eligible'` 상태에서 복구를 완료하지 못한 사용자를 `'none'`으로 변경
3. **새로운 복구 기회 생성**: 어제 working day를 놓친 사용자를 `'none'`에서 `'eligible'`로 변경

### 8.3 연속 Miss 감지 로직

`hasMissedMultipleWorkingDays` 함수는 다음을 확인합니다:
- 이전 working day (prevWorkingDay) posting 수
- 그 전 working day (prevPrevWorkingDay) posting 수
- 둘 다 0이면 연속 miss로 판단 → 복구 불가

### 8.4 상태 전환 테이블

| 현재 상태 | 조건 | 다음 상태 | 설명 |
|----------|------|----------|------|
| `none` | 이전 working day에 posting 있음 | `none` | 복구 필요 없음 |
| `none` | 연속 miss 감지됨 | `none` | 복구 불가 |
| `none` | 단일 miss + 오늘 0 posts | `eligible` | 복구 기회 시작 |
| `eligible` | 오늘 1 post 작성 | `partial` | 복구 진행 중 |
| `eligible` | 오늘 2+ posts 작성 | `success` | 복구 완료 |
| `eligible` | 복구 기간 만료 (midnight) | `none` | 복구 실패 |
| `partial` | 오늘 추가 post 작성 | `success` | 복구 완료 |
| `partial` | 복구 기간 만료 (midnight) | `none` | 복구 실패 |
| `success` | 다음날 midnight | `none` | 정상 상태로 복귀 |

---

## 9. 예시 시나리오

### 9.1 평일 간 복구 시나리오

#### ✅ 시나리오 1: 단일 평일 Miss → 정상 복구
```
월요일: 1+ posts ✅
화요일: 0 posts ❌ (missed)
수요일 00:00: 'none' → 'eligible' (복구 기회 생성)
수요일: 1 post → 'eligible' → 'partial'
수요일: 2nd post → 'partial' → 'success' (복구 완료)
```

#### ❌ 시나리오 2: 단일 평일 Miss → 복구 실패
```
월요일: 1+ posts ✅
화요일: 0 posts ❌ (missed)
수요일 00:00: 'none' → 'eligible'
수요일: 1 post → 'eligible' → 'partial'
목요일 00:00: 'partial' → 'none' (복구 기간 만료)
```

#### ❌ 시나리오 3: 연속 평일 Miss → 복구 불가
```
월요일: 1+ posts ✅
화요일: 0 posts ❌ (missed)
수요일: 0 posts ❌ (missed)
목요일 00:00: 'none' → 'none' (연속 miss, 복구 불가)
```

### 9.2 주말 경계 복구 시나리오

#### ✅ 시나리오 4: 금요일 Miss → 주말 복구 성공
```
목요일: 1+ posts ✅
금요일: 0 posts ❌ (missed)
토요일 00:00: 'none' → 'eligible' (복구 기간 시작)
토요일: 1 post → 'eligible' → 'partial'
토요일: 2nd post → 'partial' → 'success' (주말 복구 완료)
```

#### ✅ 시나리오 5: 금요일 Miss → 월요일 복구 성공
```
목요일: 1+ posts ✅
금요일: 0 posts ❌ (missed)
토요일 00:00: 'none' → 'eligible'
일요일 00:00: 'eligible' → 'eligible' (복구 기간 유지)
월요일 00:00: 'eligible' → 'eligible' (마지막 복구 기회)
월요일: 2 posts → 'eligible' → 'success' (복구 완료)
```

#### ❌ 시나리오 6: 금요일 Miss → 복구 기간 만료
```
목요일: 1+ posts ✅
금요일: 0 posts ❌ (missed)
토요일 00:00: 'none' → 'eligible'
일요일 00:00: 'eligible' → 'eligible'
월요일 00:00: 'eligible' → 'eligible' (마지막 기회)
월요일: 0 posts (복구 시도 안함)
화요일 00:00: 'eligible' → 'none' (복구 기간 만료)
```

#### ❌ 시나리오 7: 목요일+금요일 Miss → 복구 불가
```
수요일: 1+ posts ✅
목요일: 0 posts ❌ (missed)
금요일: 0 posts ❌ (missed)
토요일 00:00: 'none' → 'none' (연속 miss, 복구 불가)
월요일 00:00: 'none' → 'none' (여전히 복구 불가)
```

### 9.3 특수 상황 시나리오

#### ✅ 시나리오 8: 부분 복구 후 기간 만료
```
화요일: 0 posts ❌ (missed)
수요일: 1 post → 'partial' (부분 복구)
목요일 00:00: 'partial' → 'none' (복구 미완료로 만료)
```

#### ✅ 시나리오 9: 복구 완료 후 정상 전환
```
화요일: 0 posts ❌ (missed)
수요일: 2 posts → 'success' (복구 완료)
목요일 00:00: 'success' → 'none' (정상 상태로 복귀)
```

### 9.4 주요 설계 원칙 확인

#### 🔍 Working Day 계산
- `getPreviousWorkingDay(월요일)` → 금요일 (주말 건너뜀)
- `getPreviousWorkingDay(화요일)` → 월요일
- 한국 공휴일도 working day에서 제외

#### 🔍 연속 Miss 판정
- 월요일 체크 시: 금요일(이전) + 목요일(그 전) 확인
- 금요일 miss + 목요일 post → 단일 miss (복구 가능)
- 금요일 miss + 목요일 miss → 연속 miss (복구 불가)

#### 🔍 복구 기간 정의
- 금요일 miss → 토요일~월요일이 복구 기간
- 화요일 00:00에 복구 기간 만료
- 주말에도 복구 posting 가능

---

## 10. 기술적 구현 분석

### 10.1 주말 시나리오 로직 검증

#### 테스트 케이스: 금요일 Miss → 월요일 체크
- **목요일**: 사용자 포스팅 (working day) ✅
- **금요일**: 사용자 미포스팅 (working day) ❌
- **토요일/일요일**: 주말 (non-working days)
- **월요일**: 복구 상태 체크 (아직 포스팅 안함)

#### 단계별 로직 추적

**Step 1: `getPreviousWorkingDay(Monday)`**
```typescript
// Monday = 2025-01-20 (예시)
getPreviousWorkingDay(new Date('2025-01-20'))
```

**처리 과정:**
1. 월요일(2025-01-20)에서 시작
2. 이전 날짜: 일요일(2025-01-19)
3. `isWorkingDay(Sunday)` 체크: **false** (주말)
4. 이전 날짜: 토요일(2025-01-18)
5. `isWorkingDay(Saturday)` 체크: **false** (주말)
6. 이전 날짜: 금요일(2025-01-17)
7. `isWorkingDay(Friday)` 체크: **true** (working day)

**결과:** 금요일(2025-01-17) 반환 ✅

**Step 2: `hasPreviousWorkingDayPosting(userId, Monday)`**
```typescript
hasPreviousWorkingDayPosting(userId, new Date('2025-01-20'))
```

**처리 과정:**
1. `getPreviousWorkingDay(Monday)` 호출 → **금요일**
2. 날짜 키 생성: `"2025-01-17"`
3. 금요일 포스팅 조회
4. 사용자가 금요일 미포스팅: **0개 발견**

**결과:** **false** 반환 ✅

**Step 3: `hasMissedMultipleWorkingDays(userId, Monday)`**
```typescript
hasMissedMultipleWorkingDays(userId, new Date('2025-01-20'))
```

**처리 과정:**
1. Seoul 날짜로 변환: 월요일
2. 이전 working day: `getPreviousWorkingDay(Monday)` → **금요일**
3. 그 전 working day: `getPreviousWorkingDay(Friday)` → **목요일**
4. 두 날짜 포스팅 조회:
   - 금요일(2025-01-17): **0개 포스팅** (missed)
   - 목요일(2025-01-16): **1+ 포스팅** (사용자 포스팅함)
5. 연속 miss 체크: `prevDayCount === 0 && prevPrevDayCount === 0`
   - 금요일 count: 0 ✓
   - 목요일 count: 1+ ✗

**결과:** **false** 반환 (연속 miss 아님) ✅

### 10.2 로직 정확성 검증

#### ✅ 올바른 동작 확인
이 로직은 **단일 working day miss** 시나리오를 올바르게 식별합니다:

1. **금요일이 월요일의 이전 working day로 올바르게 식별됨**
2. **목요일 포스팅이 발견되어 연속 miss가 아님을 확인**
3. **금요일 miss에 대한 복구 기회가 제공되어야 함**

#### 예상되는 복구 상태 플로우
```typescript
// 월요일, 포스팅 전:
const status = await calculateRecoveryStatus(userId, new Date('2025-01-20'))
// 반환값: 'eligible' (2개 포스팅으로 복구 시작 가능)

// 월요일 첫 번째 포스팅 후:
// 반환값: 'partial' (1개 더 필요)

// 월요일 두 번째 포스팅 후:
// 반환값: 'success' (복구 완료)
```

### 10.3 핵심 인사이트

#### 주말 처리 ✅
- **주말을 올바르게 건너뛰고** 이전 working day를 찾음
- **주말 간격에도 불구하고 금요일 miss를 적절히 감지**
- **목요일 포스팅이 "연속 miss" 분류를 방지**

#### 엣지 케이스 커버리지 ✅
로직이 주말 전환을 올바르게 처리:
- 금요일 miss + 주말 → 월요일 체크 = 단일 miss (복구 가능)
- 목요일 miss + 금요일 miss + 주말 → 월요일 체크 = 연속 miss (복구 불가)

#### 결론
복구 로직이 주말 시나리오를 올바르게 처리합니다. 목요일에 포스팅하고 금요일을 놓친 후 월요일에 체크하는 사용자는 'eligible' 복구 상태를 가지며, 이는 단일 working day miss에 대한 예상 동작입니다.

---

## 11. 참고/추가 구현 노트

- RecoveryStatus, getRecoveryStatus 등은 streakUtils.ts에 구현
- RecoveryBanner는 boardPage에서만 노출
- streak badge, 통계 등은 기존 로직과 동일하게 처리
- 복구 내역 별도 저장/조회는 추후 확장 가능
