# DailyWritingFriends 디자인 시스템 100 가이드

이 문서는 본 앱의 일관적이고 단순한 디자인을 재현하기 위한 100가지 구체적(정량적 80개, 정성적 20개) 가이드입니다. 실제 코드와 UI에서 관찰된 수치, 규칙, 패턴을 기반으로 작성되었습니다.

---

## 1. 레이아웃 & 그리드

1. **모든 주요 컨테이너는 `mx-auto`와 `max-w-3xl` 또는 `max-w-4xl`을 사용해 중앙 정렬, 최대 폭 제한**
2. **모바일 우선: `px-4`~`px-6`(모바일), `sm:px-6`, `lg:px-12` 등 반응형 패딩 적용**
3. **상단/하단 여백은 `py-8`, `mb-4`, `mb-6`, `mt-12` 등 8~48px 단위로 통일**
4. **카드/폼/리스트는 `rounded`, `rounded-xl`, `shadow`, `border`로 구분감 부여**
5. **카드 내부 패딩은 `p-4`, `p-5`, `px-4 py-3` 등 16~20px**
6. **리스트 간격은 `space-y-4`(16px), `space-y-6`(24px)로 통일**
7. **하단 네비게이션은 `fixed bottom-0 inset-x-0` + `border-t` + `bg-background`**
8. **스크롤 영역은 `min-h-screen`, `flex-1`, `overflow-auto`로 구현**
9. **모든 페이지는 최소 높이 `min-h-screen` 보장**
10. **카드/버튼 등 터치 영역 최소 높이 44px 이상**

## 2. 타이포그래피

11. **제목: `text-2xl`(32px), `text-3xl`(36px), `font-bold`**
12. **본문: `text-base`(16px), `text-lg`(18px), `text-muted-foreground`**
13. **카드/리스트 제목: `text-xl`(24px), `font-semibold`**
14. **보조 텍스트: `text-sm`(14px), `text-xs`(12px)**
15. **반응형 폰트: `md:text-4xl`, `sm:text-lg` 등 사용**
16. **폰트 패밀리: 시스템 폰트(Apple, Noto Sans 등) 기본**
17. **줄 간격: `leading-relaxed`, `prose-p:my-1` 등으로 가독성 확보**
18. **텍스트 컬러는 Tailwind의 `text-foreground`, `text-muted-foreground`, `text-primary` 등 명확히 구분**
19. **텍스트 정렬은 기본 좌측, 안내/피드백은 `text-center`**
20. **에러/경고 텍스트는 `text-red-500`**

## 3. 색상 & 테마

21. **배경색: `bg-background`, 카드/입력: `bg-card`, 강조: `bg-primary`**
22. **테두리: `border`, `border-border`, `border-gray-200` 등**
23. **포커스/호버: `hover:bg-gray-100`, `hover:shadow-md`, `active:bg-primary/10`**
24. **버튼/아이콘: `text-primary`, `text-muted-foreground`**
25. **뱃지/상태: `variant="outline"`, `border-muted-foreground/30`**
26. **섀도우: `shadow`, `shadow-sm`, `hover:shadow-md`**
27. **에러/로딩: `text-red-500`, `text-primary`**
28. **다크모드 지원: `dark:prose-invert` 등**
29. **상태 메시지: `bg-muted`, `bg-background`**
30. **카드/버튼/입력 등은 일관된 색상 토큰 사용**

## 4. 네비게이션 & 구조

31. **하단 탭 네비게이션: 4개(홈, 통계, 알림, 내정보), 아이콘+텍스트**
32. **탭 아이콘 크기: `size-6`(24px)**
33. **탭 활성화: `text-primary`, 비활성: `text-muted-foreground`**
34. **상단 헤더: `sticky top-0 z-10 border-b bg-background`**
35. **페이지 내 주요 섹션은 `main`, `header`, `footer` 등 시맨틱 태그 사용**
36. **모든 주요 페이지는 `BottomNavigatorLayout`으로 감싸기**
37. **페이지 전환/로딩은 `StatusMessage`, `Skeleton` 등으로 통일**
38. **뒤로가기/취소 버튼은 항상 상단 또는 폼 하단 우측**
39. **CTA(주요 버튼)는 하단 고정(`sticky bottom-0`) 또는 폼 하단 우측**
40. **모달/다이얼로그는 `AlertDialog` 컴포넌트 사용**

## 5. 카드 & 리스트

41. **카드: `rounded`, `shadow`, `border`, 내부 `p-4`~`p-5`**
42. **카드 제목: `text-xl font-semibold`**
43. **카드 내 프로필: `size-8`~`size-12`(32~48px) 원형**
44. **카드 내 미리보기: `line-clamp-3`, `prose-sm`**
45. **카드 내 버튼/뱃지: `h-5`, `px-1.5`, `py-0.5`, `text-xs`**
46. **카드/리스트 간 간격: `space-y-4`, `space-y-6`**
47. **리스트 항목: `rounded bg-white p-4 shadow hover:bg-gray-100`**
48. **로딩 시 `PostCardSkeleton` 등 스켈레톤 UI 사용**
49. **카드 클릭: `cursor-pointer`, `active:scale-[0.98]`**
50. **카드 내 상태/댓글/뱃지 등은 우측 하단 정렬**

## 6. 버튼 & 인터랙션

51. **버튼 높이: 최소 44px, `py-6`(프라이머리), `h-14`(설정 등)**
52. **버튼 폭: `w-full`(주요 CTA), `md:w-auto`(데스크탑)**
53. **버튼 라운드: `rounded-xl`, `rounded-lg`, `rounded`**
54. **버튼 색상: `variant="outline"`, `variant="ghost"`, `bg-primary`**
55. **버튼 아이콘: `size-4`~`size-6`, 좌측 또는 우측 정렬**
56. **버튼 호버: `hover:bg-gray-100`, `hover:shadow-md`**
57. **비활성화: `disabled:opacity-50`, `disabled:cursor-not-allowed`**
58. **폼 내 버튼은 항상 우측 정렬(`flex justify-end`)**
59. **취소/뒤로가기: `variant="outline"`, 우측 또는 상단**
60. **로딩 중: 스피너(`Loader2`)와 텍스트**

## 7. 폼 & 입력

61. **입력 필드: `Input`, `Textarea`, `rounded`, `border`, `p-2`~`p-4`**
62. **입력 폭: `w-full`, 최대 `max-w-md`(400~500px)**
63. **입력 간 간격: `space-y-2`, `space-y-4`**
64. **라벨: `Label`, `text-sm`, `mb-1`**
65. **에러 메시지: `text-red-600 text-sm`**
66. **폼 내부 여백: `p-4`, `p-6`**
67. **폼 제출 버튼: 우측 하단, `flex justify-end`**
68. **폼 내 필수값은 `*` 또는 플레이스홀더로 안내**
69. **입력 제한: 소개글 150자, 닉네임 등**
70. **파일 업로드: 숨김 input + 버튼/아바타 클릭**

## 8. 피드백 & 상태

71. **로딩: `StatusMessage`, `Skeleton`, `Loader2`**
72. **에러: `StatusMessage`, `AlertCircle`, `text-red-500`**
73. **성공/실패: `toast`, `variant="destructive"`**
74. **상태 메시지: `text-center`, `p-8`**
75. **알림/피드백: `NotificationsPage`, `NotificationSettingPage`**
76. **상태 뱃지: `Badge`, `variant="outline"`**
77. **상태/피드백은 항상 명확한 컬러와 아이콘 사용**
78. **로딩/에러/빈 상태는 일관된 컴포넌트로 처리**
79. **토스트/다이얼로그 등 즉각적 피드백 제공**
80. **상태 메시지/로딩은 항상 중앙 정렬**

## 9. 반응형 & 접근성

81. **모바일 우선: `min-h-screen`, `flex-col`, `px-4`~`px-6`**
82. **데스크탑: `md:`, `lg:`, `xl:` 프리픽스 적극 사용**
83. **터치 영역: 최소 44x44px, 버튼/카드/탭 등**
84. **키보드 접근성: `role="button"`, `tabIndex=0`, `onKeyDown`**
85. **시맨틱 태그: `main`, `header`, `footer`, `nav`**
86. **명확한 포커스 스타일: `focus:outline-none`, `focus:ring`**
87. **이미지 alt 속성, 아이콘 aria-label 등 접근성 보장**
88. **색상 대비: 텍스트/배경 4.5:1 이상**
89. **애니메이션: `transition-all`, `duration-200`~`duration-300`**
90. **모션/애니메이션은 `framer-motion` 등으로 부드럽게**

## 10. 컴포넌트 구조 & 네이밍

91. **컴포넌트 폴더 구조: `components`, `hooks`, `pages`, `services`**
92. **컴포넌트 네이밍: `PostCard`, `UserPageHeader`, `StatusMessage` 등 역할 기반**
93. **공통 UI: `Button`, `Card`, `Input`, `Badge`, `Skeleton` 등 재사용**
94. **커스텀 훅: `useAuth`, `usePosts`, `useToast` 등 로직 분리**
95. **페이지 컴포넌트는 항상 단일 책임, UI만 담당**
96. **상태/로직은 훅/컨텍스트로 분리**
97. **에러/로딩/빈 상태는 별도 컴포넌트로 분리**
98. **모든 주요 페이지는 `min-h-screen`, `flex-col`, `container`**
99. **모든 주요 액션/이벤트는 명확한 함수명(`handleXxx`)**
100. **코드 일관성: 타입스크립트, 최신 React, Tailwind, Shadcn UI 적극 활용**

---

## (정성적) 디자인 철학 & 원칙 (20)

- **모바일 우선, 데스크탑 확장**: 모바일에서 완벽하게 보이고, 데스크탑에서 여백/배치만 확장
- **최소한의 색상, 최대한의 구분**: 색상은 5~6개 토큰만 사용, 강조/상태만 컬러 추가
- **여백과 간격의 일관성**: 모든 요소는 4, 8, 16, 24, 32, 48px 단위로만 배치
- **카드/리스트/폼/버튼 등 모든 UI는 재사용 가능한 컴포넌트로 분리**
- **피드백은 즉각적이고 명확하게**: 로딩/에러/성공/실패 모두 즉시 시각적 피드백
- **접근성 우선**: 키보드, 스크린리더, 색상 대비 등 항상 고려
- **터치/클릭 영역은 넉넉하게**: 실수 방지, 모바일 UX 강화
- **애니메이션은 부드럽고 자연스럽게**: 과하지 않게, UX 향상 목적
- **상태/피드백/에러는 항상 중앙 정렬, 명확한 컬러와 아이콘**
- **모든 입력/폼은 명확한 라벨, 에러, 플레이스홀더 제공**
- **네비게이션은 항상 하단 고정, 상단 헤더는 sticky**
- **로딩/에러/빈 상태는 항상 일관된 컴포넌트로 처리**
- **코드와 UI의 일관성**: 네이밍, 구조, 스타일 모두 통일
- **반응형은 Tailwind 프리픽스만으로 구현**
- **모든 주요 액션은 명확한 함수명, 명확한 UI 피드백**
- **모든 상태/피드백은 toast, dialog 등으로 즉시 안내**
- **모든 주요 페이지는 min-h-screen, flex-col, container**
- **모든 컴포넌트는 역할별로 폴더/파일 분리**
- **모든 UI는 단순하고 명확하게, 불필요한 장식 최소화**
- **최신 React, TypeScript, Tailwind, Shadcn UI 적극 활용**

---

이 가이드를 따르면 본 앱의 디자인을 99% 이상 재현할 수 있습니다. 실제 코드와 UI를 참고해 수치와 규칙을 최대한 구체적으로 명시했습니다. 