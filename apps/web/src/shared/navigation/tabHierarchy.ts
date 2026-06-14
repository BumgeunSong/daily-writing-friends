import type { TabName } from '@/shared/contexts/BottomTabHandlerContext';
import { TAB_PATHS } from '@/shared/contexts/BottomTabHandlerContext';

interface TabHierarchy {
  readonly rootPath: string;
  readonly descendantPrefixes: readonly string[];
}

/**
 * 각 탭이 소유하는 라우트 트리. 백 슬라이드 방향(아래 → 위) 판정의 기준이 된다.
 * URL prefix는 라우트 정의(`router.tsx`)에서 파생한다. 새 라우트를 추가할 때
 * 사용자 멘탈 모델상 어떤 탭에 속하는지 함께 등록한다.
 */
const TAB_HIERARCHIES: Readonly<Record<TabName, TabHierarchy>> = {
  Home: {
    rootPath: TAB_PATHS.Home,
    descendantPrefixes: ['/boards/', '/board/', '/create/'],
  },
  Stats: {
    rootPath: TAB_PATHS.Stats,
    descendantPrefixes: ['/stats/'],
  },
  Notifications: {
    rootPath: TAB_PATHS.Notifications,
    descendantPrefixes: ['/notifications/'],
  },
  User: {
    rootPath: TAB_PATHS.User,
    descendantPrefixes: ['/user/', '/account/', '/settings/'],
  },
};

function findTabOwningPath(path: string): TabName | null {
  for (const [tabName, hierarchy] of Object.entries(TAB_HIERARCHIES) as Array<[TabName, TabHierarchy]>) {
    const isTabRoot = path === hierarchy.rootPath;
    const isDescendant = hierarchy.descendantPrefixes.some((prefix) => path.startsWith(prefix));
    if (isTabRoot || isDescendant) return tabName;
  }
  return null;
}

/**
 * 현재 경로가 대상 탭의 진짜 자손 페이지인지 판정한다.
 * 같은 탭 스택의 깊은 화면에서 탭바를 탭한 경우에만 백 슬라이드가 합당하다.
 * 무관한 탭으로의 이동은 측면 이동(슬라이드 없음)으로 처리한다.
 */
export function isTabAncestorOfPath(targetTab: TabName, currentPath: string): boolean {
  const tabRoot = TAB_HIERARCHIES[targetTab].rootPath;
  if (currentPath === tabRoot) return false;
  return findTabOwningPath(currentPath) === targetTab;
}
