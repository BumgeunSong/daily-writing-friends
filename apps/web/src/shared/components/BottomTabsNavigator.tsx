import { Home, Bell, User, ChartNoAxesColumnIncreasing } from 'lucide-react';
import { Link, useLocation } from '@/shared/navigation';
import type { TabName} from '@/shared/contexts/BottomTabHandlerContext';
import { useBottomTabHandler } from '@/shared/contexts/BottomTabHandlerContext';
import { useNavigation } from '@/shared/contexts/NavigationContext';
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
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const { handleTabAction } = useBottomTabHandler();
  const { isNavVisible } = useNavigation();

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
                handleTabAction(tab.name);
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
