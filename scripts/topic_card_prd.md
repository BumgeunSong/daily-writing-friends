# Topic Card(글감) PRD

## Overview
"Topic Card(글감)" 기능은 사용자가 글을 쓸 때 영감을 얻을 수 있도록, 다양한 주제(글감)를 카드 형태로 제공하는 기능입니다.  
사용자는 글감 리스트를 Carousel UI로 탐색하며, 원하는 글감을 선택해 글쓰기를 시작할 수 있습니다.  
글감은 관리자(admin)가 Firestore 콘솔을 통해 미리 등록하며, 각 사용자는 글감을 북마크하거나 숨길 수 있습니다.  
북마크/숨김 등 개인화 상태는 유저별로 관리되며, **북마크한 글감은 사용자가 새로고침/재진입 시 리스트 상단에 우선적으로 노출**됩니다. (즉시 정렬 X)

## Core Features
- **글감(Topic Card) Carousel**
  - shadcn Carousel(Embla 기반, motion/swipe 지원)로 글감 리스트를 가로 슬라이드 UI로 제공
  - 모바일/데스크탑 모두 최적화된 반응형 디자인
  - 각 글감은 title, description을 포함
  - **Carousel은 무한 순환(loop) 지원**

- **글감 선택 및 글쓰기 연동**
  - 사용자가 글감의 CTA(글쓰기 시작) 버튼 클릭 시, PostCreationPage로 이동
  - 글감의 title → 글쓰기 제목, description → 글쓰기 본문에 자동 입력(프리필)

- **글감 북마크**
  - 각 글감 카드 우상단에 북마크(즐겨찾기) 버튼
  - 북마크한 글감은 해당 유저의 리스트에서 **상단에 우선 노출(정렬 우선순위, 단 즉시 반영 X, 새로고침/재진입 시 적용)**
  - 북마크 상태는 유저별로 Firestore에 저장
  - **북마크 시 Sonner 토스트로 '북마크된 글감은 곧 가장 먼저 보여드릴게요' 등 안내 메시지 노출**

- **글감 삭제(숨김)**
  - 각 글감 카드 우상단에 삭제(숨김) 버튼
  - 삭제 시 해당 유저의 리스트에서만 숨김 처리(soft delete)
  - 다른 유저의 리스트에는 영향 없음
  - **숨김 시 Carousel이 자동으로 다음 카드로 이동**

- **기본 글감 관리**
  - 20~30개의 기본 글감은 admin이 Firestore 콘솔에서 직접 등록/관리
  - 일반 사용자는 글감 생성 불가(향후 확장 가능)

- **개인화(향후)**
  - 향후, 사용자의 글쓰기 이력, 북마크/삭제 이력, 태그 기반 등으로 글감 리스트를 개인화할 수 있도록 확장 고려

## User Experience
- **대상 사용자**: 글쓰기를 원하는 모든 사용자
- **주요 플로우**:
  1. 사용자가 글쓰기 페이지 진입
  2. 상단 Carousel에서 글감 리스트 탐색(좌우 스와이프/버튼, 무한 순환)
  3. 글감의 CTA(글쓰기 시작) 클릭 → PostCreationPage로 이동, 글감 내용이 자동 입력됨
  4. 북마크/삭제 버튼으로 글감 리스트를 개인화
  5. **북마크 시 Sonner 토스트로 안내 메시지 노출, 숨김 시 자동 다음 카드 이동**
- **UI/UX 고려사항**:
  - shadcn Carousel(Embla) 사용, motion/swipe 지원, 반응형, **loop 옵션 적용**
  - 북마크/삭제 버튼은 카드 우상단에 배치, 터치 영역 충분히 확보
  - **북마크한 글감은 새로고침/재진입 시 리스트 상단에 고정(즉시 정렬 X)**
  - 삭제한 글감은 해당 유저에게만 숨김
  - 로딩/에러/빈 상태 명확하게 표시
  - **Sonner 토스트로 피드백 제공**

## Implementation Rules

1. **Mobile-First Design**
   - 항상 모바일 화면을 우선적으로 설계/구현하고, 이후 데스크탑 등 큰 화면에 대응합니다.
   - Tailwind의 반응형 프리픽스(sm:, md:, lg:, xl:)를 적극 활용해 다양한 화면 크기에 맞게 레이아웃을 조정합니다.

2. **Consistent Design System**
   - 색상, 타이포그래피, 간격, 컴포넌트 스타일의 일관성을 위해 shadcn UI 컴포넌트를 최대한 활용합니다.

3. **Firebase**
   - Firestore 쿼리는 항상 최소화하여 읽기/쓰기 비용과 성능을 최적화합니다.

4. **Error Handling**
   - React Error Boundary를 구현해 예외 상황을 안전하게 처리합니다.
   - 사용자 액션에 대해 명확한 피드백(로딩, 성공, 에러 메시지 등)을 제공합니다.
   - **Sonner 토스트로 주요 피드백 제공**

5. **Hook and Data Fetching**
   - 데이터/상태 관리는 커스텀 훅으로 캡슐화하여 재사용성을 높입니다.
   - 데이터 fetch에는 react-query를 사용합니다.

6. **Animation and Transitions**
   - 페이지 전환, 마이크로 인터랙션 등 UX 향상을 위해 부드러운 애니메이션을 적용합니다.
   - Tailwind의 transition 유틸리티 또는 Framer Motion 등 라이브러리를 활용합니다.
   - **Carousel은 loop(무한 순환) 옵션을 반드시 적용합니다.**

## Technical Architecture
- **System Components**
  - React + TypeScript + Vite + shadcn UI + Tailwind CSS
  - Firestore(글감/유저별 상태 저장)
  - shadcn Carousel(Embla 기반, **loop 지원**)
  - **Sonner(토스트 피드백)**
- **Data Models**
  - `TopicCard`: `{ id: string, title: string, description: string, createdAt: Timestamp, createdBy: string }`
  - `UserTopicState` (유저별 서브컬렉션): `/users/{userId}/topicStates/{topicId}` → `{ bookmarked: boolean, deleted: boolean }`
- **APIs and Integrations**
  - Firestore: `/topicCards` (글감), `/users/{userId}/topicStates` (유저별 상태)
  - 글감 리스트 fetch: `/topicCards` 전체 + `/users/{userId}/topicStates` 조합
  - 북마크/삭제: `/users/{userId}/topicStates/{topicId}`에 상태 저장/업데이트
- **Infrastructure Requirements**
  - 기존 인프라와 동일, 추가 요구사항 없음

## Development Roadmap
- **MVP**
  1. Firestore에 기본 글감 데이터 모델 및 컬렉션 설계/생성
  2. 글감 Carousel UI(shadcn Embla, **loop**) 구현(반응형)
  3. 글감 선택 시 PostCreationPage로 이동, 프리필 연동
  4. 북마크/삭제 상태 관리 및 UI 구현(유저별 상태)
  5. 북마크/삭제 반영된 글감 리스트 정렬/필터링(단, 북마크 정렬은 새로고침/재진입 시 적용)
  6. **Sonner 토스트/숨김 시 자동 이동 등 UX 개선**
- **Future Enhancements**
  - 글감 추천/개인화 알고리즘(이력, 태그, AI 등)
  - admin 글감 관리 UI
  - 다국어 지원, 태그/카테고리, 썸네일 등 메타데이터 확장
  - 일반 유저 글감 제안/생성 기능

## Logical Dependency Chain
- 1) Firestore 데이터 모델/컬렉션 설계
- 2) 글감 Carousel UI 및 fetch 로직 구현
- 3) 북마크/삭제 상태 관리 및 UI
- 4) PostCreationPage 연동(프리필)
- 5) QA 및 UI/UX 개선
- 6) **Sonner 토스트/Carousel loop/숨김 UX 등 신규 요구사항 반영**

## Risks and Mitigations
- **북마크/삭제 동기화 문제**: Firestore 트랜잭션/merge 업데이트로 일관성 유지
- **글감 리스트/상태 fetch 성능**: 인덱스 최적화, 쿼리 최소화
- **UI/UX 불일치**: shadcn Carousel 예제/가이드라인 적극 활용, 모바일/데스크탑 QA, **Sonner/loop 등 신규 요구사항 반영**

## Appendix
- **shadcn Carousel 문서**: [https://ui.shadcn.com/docs/components/carousel](https://ui.shadcn.com/docs/components/carousel)
- **Sonner(토스트) 문서**: [https://ui.shadcn.com/docs/components/sonner](https://ui.shadcn.com/docs/components/sonner)
- **예상 Firestore 구조**
  - `/topicCards/{topicId}`: { title, description, ... }
  - `/users/{userId}/topicStates/{topicId}`: { bookmarked, deleted }
- **향후 확장**
  - 추천/개인화, 태그, 썸네일, admin UI 등 