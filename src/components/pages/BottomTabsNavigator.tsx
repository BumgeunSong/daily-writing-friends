import { Home, Bell, User, ChartNoAxesColumnIncreasing } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const tabs = [
  { name: 'Home', icon: Home, path: '/boards' },
  { name: 'Stats', icon: ChartNoAxesColumnIncreasing, path: '/stats' },
  { name: 'Notifications', icon: Bell, path: '/notifications' },
  { name: 'Account', icon: User, path: '/account' },
];

export default function BottomTabsNavigator() {
  const location = useLocation();

  return (
    <nav className='fixed inset-x-0 bottom-0 border-t border-border bg-background safe-area-pb'>
      <div className='flex justify-around'>
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            to={tab.path}
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
