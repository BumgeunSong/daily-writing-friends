'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminQueryKeys, getMe } from '@/apis/admin-api'

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
  const router = useRouter()
  const queryClient = useQueryClient()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, loading: authLoading, logout } = useAuth()

  const isSignedIn = !authLoading && !!user

  // Clear all cached admin data whenever the signed-in user changes. This
  // prevents a previous admin's cached { isAdmin: true } from being served
  // to a different user after logout/login within the same browser session.
  useEffect(() => {
    queryClient.removeQueries({ queryKey: ['admin'] })
  }, [user?.uid, queryClient])

  // Verify admin status server-side. The ADMIN_EMAILS allowlist lives only on
  // the server — this query is the authoritative check for all admin sub-pages.
  // Scoped to user.uid so cached results never cross user sessions.
  const {
    data: meData,
    isLoading: meLoading,
    isError: meError,
    refetch: refetchMe,
  } = useQuery({
    queryKey: adminQueryKeys.me(user?.uid ?? ''),
    queryFn: getMe,
    enabled: isSignedIn,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const isAdmin = meData?.isAdmin === true

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Show skeleton while Firebase auth state or admin check is in flight.
  // Never render admin content (or even the layout shell) until we know the
  // viewer is an authenticated admin.
  if (authLoading || (isSignedIn && meLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    )
  }

  // Not authenticated — redirect handled by the useEffect above.
  if (!user) {
    return null
  }

  // Admin check failed due to a network or server error. Show a distinct error
  // state with a retry button so legitimate admins aren't locked out.
  if (meError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">오류가 발생했습니다</CardTitle>
            <CardDescription>
              관리자 권한을 확인하는 중 오류가 발생했습니다. 다시 시도해 주세요.
            </CardDescription>
          </CardHeader>
          <CardFooter className="gap-2">
            <Button onClick={() => refetchMe()}>
              다시 시도
            </Button>
            <Button variant="outline" onClick={() => router.push('/')}>
              홈으로 돌아가기
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Authenticated but not in the admin allowlist.
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">접근 제한됨</CardTitle>
            <CardDescription>
              이 페이지에 접근할 수 있는 권한이 없습니다.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => router.push('/')}>
              홈으로 돌아가기
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
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