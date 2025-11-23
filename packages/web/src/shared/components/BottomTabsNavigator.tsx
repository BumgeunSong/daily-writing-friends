import { Home, Bell, User, ChartNoAxesColumnIncreasing } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { TabName, useBottomTabHandler } from '@/shared/contexts/BottomTabHandlerContext';
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

export default function BottomTabsNavigator() {
  const location = useLocation();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const { handleTabAction } = useBottomTabHandler();
  const { isNavVisible } = useNavigation();
  
  return (
    <nav 
      className={cn(
        "fixed inset-x-0 bottom-0 border-t border-border bg-background z-50 transition-all duration-200 ease-out",
        isIOS && "pb-2",
        isNavVisible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className='flex justify-around'>
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            to={tab.path}
            onClick={(e) => {
              e.preventDefault();
              handleTabAction(tab.name);
            }}
            className={cn(
              "flex flex-col items-center p-4 min-h-[44px] transition-colors duration-200 reading-focus",
              location.pathname === tab.path ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <tab.icon className='size-6' />
          </Link>
        ))}
      </div>
    </nav>
  );
}
