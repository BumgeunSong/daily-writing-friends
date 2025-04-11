import { TabName, useBottomTabHandler, useRegisterTabHandler } from '@/contexts/BottomTabHandlerContext';
import { Home, Bell, User, ChartNoAxesColumnIncreasing } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface Tab {
  name: TabName;
  icon: React.ElementType;
  path: string;
}

const tabs: Tab[] = [
  { name: 'Home', icon: Home, path: '/boards' },
  { name: 'Stats', icon: ChartNoAxesColumnIncreasing, path: '/stats' },
  { name: 'Notifications', icon: Bell, path: '/notifications' },
  { name: 'Account', icon: User, path: '/account' },
];

export default function BottomTabsNavigator() {
  const location = useLocation();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const { handleTabAction } = useBottomTabHandler();
  
  return (
    <nav className={`fixed inset-x-0 bottom-0 border-t border-border bg-background ${isIOS ? 'pb-2' : ''}`}>
      <div className='flex justify-around'>
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            to={tab.path}
            onClick={(e) => {
              e.preventDefault();
              handleTabAction(tab.name);
            }}
            className={`flex flex-col items-center p-4 ${
              location.pathname === tab.path ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <tab.icon className='size-6' />
          </Link>
        ))}
      </div>
    </nav>
  );
}
