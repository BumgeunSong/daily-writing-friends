'use client'

import { fetchBoardMapped, fetchBoardUsers as fetchBoardUsersFromSupabase, fetchWaitingUserIds } from '@/apis/supabase-reads'
import { ArrowLeft, Users, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  useQuery, 
  useQueryClient 
} from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'

interface BoardUser {
  id: string
  realName: string | null
  nickname: string | null
  email: string | null
  phoneNumber: string | null
  permission: string
}

// 게시판 정보 조회 함수
const fetchBoard = async (boardId: string) => {
  if (!boardId) return null
  return fetchBoardMapped(boardId)
}

// 게시판 권한을 가진 사용자 목록 조회 함수
const fetchBoardUsers = async (boardId: string): Promise<BoardUser[]> => {
  if (!boardId) return []
  const rows = await fetchBoardUsersFromSupabase(boardId)
  return rows.map(row => ({
    id: row.user.id,
    realName: row.user.real_name,
    nickname: row.user.nickname,
    email: row.user.email,
    phoneNumber: row.user.phone_number,
    permission: row.permission,
  }))
}

// 권한 레벨에 따른 뱃지 스타일 반환
const getPermissionBadge = (permission: 'read' | 'write' | 'admin') => {
  switch (permission) {
    case 'admin':
      return (
        <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-700/10">
          관리자
        </span>
      )
    case 'write':
      return (
        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10">
          쓰기
        </span>
      )
    case 'read':
      return (
        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-700/10">
          읽기
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-500 ring-1 ring-inset ring-gray-500/10">
          알 수 없음
        </span>
      )
  }
}

export default function BoardDetailPage() {
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const boardId = params.boardId as string

  // 게시판 정보 쿼리
  const { 
    data: board,
    isLoading: boardLoading,
    error: boardError
  } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => fetchBoard(boardId),
    enabled: !!boardId,
    staleTime: 5 * 60 * 1000, // 5분
  })

  // 게시판 사용자 목록 쿼리
  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ['boardUsers', boardId],
    queryFn: () => fetchBoardUsers(boardId),
    enabled: !!boardId,
    staleTime: 2 * 60 * 1000, // 2분
  })

  // 대기 중인 사용자 쿼리
  const {
    data: waitingUsers = [],
  } = useQuery({
    queryKey: ['waitingUsers', boardId],
    queryFn: () => fetchWaitingUserIds(boardId),
    enabled: !!boardId,
    staleTime: 2 * 60 * 1000, // 2분
  })

  const handleGoBack = () => {
    router.push('/admin/boards')
  }

  if (boardLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (boardError || !board) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={handleGoBack}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          게시판 목록으로 돌아가기
        </Button>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>게시판 정보를 불러올 수 없습니다</AlertTitle>
          <AlertDescription>
            {boardError instanceof Error ? boardError.message : '게시판이 존재하지 않거나 접근할 수 없습니다.'}
          </AlertDescription>
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['board', boardId] })}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              다시 시도
            </Button>
          </div>
        </Alert>
      </div>
    )
  }

  const firstDay = board.firstDay instanceof Date ? board.firstDay : null

  const createdAt = board.createdAt instanceof Date ? board.createdAt : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={handleGoBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          게시판 목록으로 돌아가기
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{board.title}</h1>
        <p className="text-muted-foreground">
          게시판 상세 정보 및 사용자 권한을 확인합니다.
        </p>
      </div>

      {/* 게시판 정보 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>게시판 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">제목</label>
              <div className="mt-1 text-sm">{board.title}</div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">코호트</label>
              <div className="mt-1">
                {board.cohort ? (
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    {board.cohort}
                  </span>
                ) : (
                  <span className="text-gray-400">설정되지 않음</span>
                )}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">시작일</label>
              <div className="mt-1 text-sm">
                {firstDay ? (
                  <div>
                    {firstDay.toLocaleDateString('ko-KR')} ({firstDay.toLocaleDateString('ko-KR', { weekday: 'short' })})
                  </div>
                ) : (
                  <span className="text-gray-400">설정되지 않음</span>
                )}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">생성일</label>
              <div className="mt-1 text-sm">
                {createdAt ? (
                  createdAt.toLocaleDateString('ko-KR')
                ) : (
                  <span className="text-gray-400">알 수 없음</span>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">설명</label>
            <div className="mt-1 text-sm">
              {board.description || '설명이 없습니다.'}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">대기 중인 사용자</label>
            <div className="mt-1 text-sm">
              {waitingUsers.length > 0 ? (
                <span className="text-orange-600">{waitingUsers.length}명 대기 중</span>
              ) : (
                <span className="text-green-600">대기 중인 사용자 없음</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 사용자 권한 목록 카드 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                사용자 권한 목록
                <span className="ml-2 text-muted-foreground font-normal text-sm">
                  ({users.length}명)
                </span>
              </CardTitle>
              <CardDescription>
                이 게시판에 접근 권한을 가진 사용자 목록입니다.
              </CardDescription>
            </div>
            {usersError && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetchUsers()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                새로고침
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">사용자 정보를 불러오는 중...</span>
            </div>
          ) : usersError ? (
            <Alert variant="destructive" className="my-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>사용자 정보를 불러올 수 없습니다</AlertTitle>
              <AlertDescription>
                {usersError instanceof Error ? usersError.message : '사용자 권한 정보를 가져오는 중 오류가 발생했습니다.'}
              </AlertDescription>
            </Alert>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p>이 게시판에 권한을 가진 사용자가 없습니다.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>닉네임</TableHead>
                  <TableHead>실명</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>전화번호</TableHead>
                  <TableHead className="text-center">권한</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.nickname || '닉네임 없음'}
                      </TableCell>
                      <TableCell>
                        {user.realName || '실명 없음'}
                      </TableCell>
                      <TableCell>
                        {user.email || '이메일 없음'}
                      </TableCell>
                      <TableCell>
                        {user.phoneNumber ? (
                          user.phoneNumber
                        ) : (
                          <span className="text-gray-400">null</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {getPermissionBadge(user.permission as 'read' | 'write' | 'admin')}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-3">
          <div className="text-xs text-muted-foreground">
            마지막 업데이트: {new Date().toLocaleString('ko-KR')}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}