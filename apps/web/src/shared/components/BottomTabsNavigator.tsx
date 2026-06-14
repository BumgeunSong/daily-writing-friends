import { Home, Bell, User, ChartNoAxesColumnIncreasing } from 'lucide-react';
import { Link, useLocation, useNavigate } from '@/shared/navigation';
import type { TabName} from '@/shared/contexts/BottomTabHandlerContext';
import { TAB_PATHS, useBottomTabHandler } from '@/shared/contexts/BottomTabHandlerContext';
import { useNavigation } from '@/shared/contexts/NavigationContext';
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

const TAB_ROOT_PATHS: ReadonlySet<string> = new Set(Object.values(TAB_PATHS));

const SPRING_EASING_STYLE = {
  transitionTimingFunction: 'var(--dwf-transition-easing)',
} as const;

export default function BottomTabsNavigator() {
  const location = useLocation();
  const navigate = useNavigate();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const { handleTabAction } = useBottomTabHandler();
  const { isNavVisible } = useNavigation();

  // 깊은 화면(예: PostDetailPage)에서 탭바를 탭하면 상위 계층으로 올라가는 느낌으로
  // 백 슬라이드. 탭 루트 사이의 측면 이동은 슬라이드 없이 즉시 전환(원칙).
  const handleTabClick = (tab: Tab) => {
    const isSameTab = location.pathname === tab.path;
    if (isSameTab) {
      handleTabAction(tab.name);
      return;
    }
    const isFromDeepPage = !TAB_ROOT_PATHS.has(location.pathname);
    if (isFromDeepPage) {
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
