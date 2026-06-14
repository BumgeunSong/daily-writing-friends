import { Home, Bell, User, ChartNoAxesColumnIncreasing } from 'lucide-react';
import { Link, useLocation, useNavigate } from '@/shared/navigation';
import type { TabName} from '@/shared/contexts/BottomTabHandlerContext';
import { useBottomTabHandler } from '@/shared/contexts/BottomTabHandlerContext';
import { useNavigation } from '@/shared/contexts/NavigationContext';
import { isTabAncestorOfPath } from '@/shared/navigation/tabHierarchy';
import { markPageTransitionBack } from '@/shared/navigation/useViewTransitionNavigate';
import { cn } from "@/shared/utils/cn";

interface Tab {
  name: TabName;
  icon: React.ElementType;
  path: string;
}

const tabs: Tab[] = [
  { name: 'Home', icon: Home, path: '/boards' },
  { name: 'Stats', icon: ChartNoAxesColumnIncreasing, path: '/stats' },
  { name: 'Notifications', icon: Bell, path: '/notifications' },
  { name: 'User', icon: User, path: '/user' },
];

const SPRING_EASING_STYLE = {
  transitionTimingFunction: 'var(--dwf-transition-easing)',
} as const;

export default function BottomTabsNavigator() {
  const location = useLocation();
  const navigate = useNavigate();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const { handleTabAction } = useBottomTabHandler();
  const { isNavVisible } = useNavigation();

  // 같은 탭 스택의 깊은 화면에서 탭바를 탭한 경우에만 백 슬라이드.
  // 무관한 탭으로의 점프(예: PostDetailPage → Stats)는 측면 이동이라
  // 슬라이드 없이 즉시 전환한다(원칙: 방향은 계층을 의미한다).
  const handleTabClick = (tab: Tab) => {
    if (location.pathname === tab.path) {
      handleTabAction(tab.name);
      return;
    }
    if (isTabAncestorOfPath(tab.name, location.pathname)) {
      markPageTransitionBack();
      navigate(tab.path, { viewTransition: true });
      return;
    }
    handleTabAction(tab.name);
  };

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 bg-background z-50 shadow-[0_-1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_-1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200",
        isIOS && "pb-2",
        isNavVisible ? "translate-y-0" : "translate-y-full"
      )}
      style={SPRING_EASING_STYLE}
    >
      <div className='flex justify-around'>
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.name}
              to={tab.path}
              onClick={(e) => {
                e.preventDefault();
                handleTabClick(tab);
              }}
              className={cn(
                "flex flex-col items-center p-4 min-h-[44px] transition-[color,background-color,transform] duration-200 reading-focus active:scale-[0.96]",
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
              style={SPRING_EASING_STYLE}
            >
              <tab.icon
                className={cn(
                  'size-6 transition-transform duration-200',
                  isActive ? 'scale-[1.05]' : 'scale-100'
                )}
                style={SPRING_EASING_STYLE}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
