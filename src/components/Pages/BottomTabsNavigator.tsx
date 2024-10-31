import { Link, useLocation } from 'react-router-dom'
import { Home, Bell, User } from 'lucide-react'

const tabs = [
  { name: 'Home', icon: Home, path: '/boards' },
  { name: 'Notifications', icon: Bell, path: '/notifications' },
  { name: 'Account', icon: User, path: '/account' },
]

export default function BottomTabsNavigator() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="flex justify-around">
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            to={tab.path}
            className={`p-4 flex flex-col items-center ${
              location.pathname === tab.path ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <tab.icon className="h-6 w-6" />
          </Link>
        ))}
      </div>
    </nav>
  )
}