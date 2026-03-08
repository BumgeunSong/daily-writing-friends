'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  Newspaper,
  MessageSquare,
  Settings,
  Menu,
  LogOut,
  XCircle,
  UserCheck
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    title: '대시보드',
    href: '/admin',
    icon: <LayoutDashboard className="h-5 w-5" />
  },
  {
    title: '사용자 관리',
    href: '/admin/users',
    icon: <Users className="h-5 w-5" />
  },
  {
    title: '신청 대기 사용자 승인',
    href: '/admin/user-approval',
    icon: <UserCheck className="h-5 w-5" />
  },
  {
    title: '게시판 관리',
    href: '/admin/boards',
    icon: <Newspaper className="h-5 w-5" />
  },
  {
    title: '게시물 관리',
    href: '/admin/posts',
    icon: <MessageSquare className="h-5 w-5" />
  },
  {
    title: '설정',
    href: '/admin/settings',
    icon: <Settings className="h-5 w-5" />
  }
]

export default function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { logout } = useAuth()

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 모바일 헤더 */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-semibold">관리자 대시보드</h1>
        <Button variant="ghost" size="icon" onClick={logout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 */}
        <aside
          className={cn(
            "z-50 w-64 bg-card border-r shadow-sm transition-transform",
            "lg:relative lg:translate-x-0",
            sidebarOpen 
              ? "fixed inset-y-0 left-0 translate-x-0" 
              : "fixed inset-y-0 left-0 -translate-x-full"
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-4 py-6">
              <h2 className="text-xl font-bold">관리자</h2>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={toggleSidebar}
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
            
            <nav className="flex-1 space-y-1 px-2 py-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    pathname === item.href
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {item.icon}
                  <span className="ml-3">{item.title}</span>
                </Link>
              ))}
            </nav>
            
            <div className="border-t p-4">
              <Button variant="outline" className="w-full" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </Button>
            </div>
          </div>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-auto">
          <div className="container px-4 md:px-6 py-6 max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
} 