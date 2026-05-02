'use client'

import { useState, useEffect } from 'react'
import { Check, UserCheck, X, Loader2, HelpCircle, AlertCircle, RefreshCw } from 'lucide-react'
import {
  adminQueryKeys,
  approveUser,
  getBoard,
  getBoards,
  getPreviousCohortPostCount,
  getWaitingUsers,
  rejectUser,
} from '@/apis/admin-api'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { WaitingUser } from '@/types/firestore'

// Hydrate the page's WaitingUser shape from server-route data + previous-cohort
// post counts. The N+1 round-trip pattern from the original implementation is
// preserved (one call per waiting user) — server is now the rate-limited API,
// not direct Supabase.
const hydrateWaitingUsers = async (
  boardId: string,
  cohort: number | undefined
): Promise<WaitingUser[]> => {
  if (!boardId) return []
  const rows = await getWaitingUsers(boardId)
  if (!rows || rows.length === 0) return []

  const users = await Promise.all(
    rows.map(async (row): Promise<WaitingUser | null> => {
      const u = row.user
      if (!u) return null

      let previousPostsCount: number | null = null
      if (cohort !== undefined && cohort !== null) {
        try {
          previousPostsCount = await getPreviousCohortPostCount(u.id, cohort)
        } catch {
          previousPostsCount = null
        }
      }

      return {
        uid: u.id,
        id: u.id,
        realName: u.real_name,
        nickname: u.nickname,
        email: u.email,
        phoneNumber: u.phone_number,
        referrer: u.referrer,
        profilePhotoURL: u.profile_photo_url,
        bio: null,
        boardPermissions: {},
        updatedAt: null,
        previousPostsCount,
      } as WaitingUser
    })
  )
  return users.filter((u): u is WaitingUser => u !== null)
}

export default function UserApprovalPage() {
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    const storedBoardId = localStorage.getItem('adminUserApproval_selectedBoardId')
    if (storedBoardId) {
      setSelectedBoardId(storedBoardId)
    }
  }, [])

  const handleBoardSelection = (value: string) => {
    const boardId = value || null
    setSelectedBoardId(boardId)

    if (boardId) {
      localStorage.setItem('adminUserApproval_selectedBoardId', boardId)
    } else {
      localStorage.removeItem('adminUserApproval_selectedBoardId')
    }
  }

  const {
    data: boards,
    isLoading: boardsLoading,
    error: boardsError
  } = useQuery({
    queryKey: adminQueryKeys.boards,
    queryFn: getBoards,
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: selectedBoard,
    isLoading: boardLoading,
    error: boardError
  } = useQuery({
    queryKey: selectedBoardId
      ? adminQueryKeys.board(selectedBoardId)
      : ['admin', 'board', '__none__'],
    queryFn: () => (selectedBoardId ? getBoard(selectedBoardId) : null),
    enabled: !!selectedBoardId,
    staleTime: 5 * 60 * 1000,
  })

  const waitingQueryKey = selectedBoardId
    ? [...adminQueryKeys.waitingUsers(selectedBoardId), selectedBoard?.cohort ?? null] as const
    : ['admin', 'waiting-users', '__none__'] as const

  const {
    data: waitingUsers = [],
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers
  } = useQuery({
    queryKey: waitingQueryKey,
    queryFn: () =>
      hydrateWaitingUsers(selectedBoardId!, selectedBoard?.cohort ?? undefined),
    enabled: !!selectedBoardId && selectedBoard !== undefined,
    staleTime: 2 * 60 * 1000,
  })

  const approveUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!selectedBoardId) throw new Error('선택된 게시판이 없습니다.')
      const res = await approveUser({ userId, boardId: selectedBoardId })
      return { userId, status: res.status, firstTime: res.firstTime }
    },
    onSuccess: ({ userId, firstTime }) => {
      if (selectedBoardId) {
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.board(selectedBoardId) })
        queryClient.setQueryData(waitingQueryKey, (oldData: WaitingUser[] | undefined) => {
          if (!oldData) return []
          return oldData.filter(user => user.id !== userId)
        })
      }
      toast.success(
        firstTime
          ? "사용자에게 게시판 접근 권한이 부여되었습니다."
          : "이미 처리된 사용자입니다."
      )
    },
    onError: (error) => {
      console.error('Error approving user:', error)
      toast.error("사용자 승인 처리 중 오류가 발생했습니다.")
    }
  })

  const rejectUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!selectedBoardId) throw new Error('선택된 게시판이 없습니다.')
      const res = await rejectUser({ userId, boardId: selectedBoardId })
      return { userId, status: res.status, firstTime: res.firstTime }
    },
    onSuccess: ({ userId, firstTime }) => {
      if (selectedBoardId) {
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.board(selectedBoardId) })
        queryClient.setQueryData(waitingQueryKey, (oldData: WaitingUser[] | undefined) => {
          if (!oldData) return []
          return oldData.filter(user => user.id !== userId)
        })
      }
      toast.success(
        firstTime
          ? "사용자의 게시판 가입 요청이 거부되었습니다."
          : "이미 처리된 사용자입니다."
      )
    },
    onError: (error) => {
      console.error('Error rejecting user:', error)
      toast.error("사용자 거부 처리 중 오류가 발생했습니다.")
    }
  })

  const handleApproveUser = (userId: string) => {
    approveUserMutation.mutate(userId)
  }

  const handleRejectUser = (userId: string) => {
    rejectUserMutation.mutate(userId)
  }

  if (boardsLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full mb-4" />
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

  if (boardsError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>게시판 목록을 불러올 수 없습니다</AlertTitle>
        <AlertDescription>
          {boardsError instanceof Error ? boardsError.message : '서버 오류가 발생했습니다. 나중에 다시 시도해주세요.'}
        </AlertDescription>
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: adminQueryKeys.boards })}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            다시 시도
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">신청 대기 사용자 승인</h1>
        <p className="text-muted-foreground">
          게시판 가입 신청을 관리하고 사용자 접근 권한을 설정합니다.
        </p>
      </div>

      {boardError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>게시판 정보를 불러올 수 없습니다</AlertTitle>
          <AlertDescription>
            {boardError instanceof Error ? boardError.message : '선택한 게시판의 정보를 가져오는 중 오류가 발생했습니다.'}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>게시판 선택</CardTitle>
          <CardDescription>
            대기 중인 사용자를 확인할 게시판을 선택하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedBoardId || ""}
            onValueChange={handleBoardSelection}
          >
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="게시판 선택" />
            </SelectTrigger>
            <SelectContent>
              {boards && boards.length > 0 ? (
                [...boards]
                  .sort((a, b) => {
                    const cohortA = a.cohort ?? 0;
                    const cohortB = b.cohort ?? 0;
                    return cohortB - cohortA;
                  })
                  .map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.title} {board.cohort ? `(코호트 ${board.cohort})` : ''}
                    </SelectItem>
                  ))
              ) : (
                <SelectItem value="none" disabled>
                  게시판이 없습니다
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedBoardId && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>
                  대기 중인 사용자 목록
                  {selectedBoard && (
                    <span className="ml-2 text-muted-foreground font-normal text-sm">
                      ({waitingUsers.length}명)
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedBoard?.title} 게시판 가입을 신청한 사용자 목록입니다.
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
            {boardLoading || usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">사용자 정보를 불러오는 중...</span>
              </div>
            ) : usersError ? (
              <Alert variant="destructive" className="my-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>사용자 정보를 불러올 수 없습니다</AlertTitle>
                <AlertDescription>
                  {usersError instanceof Error ? usersError.message : '대기 중인 사용자 정보를 가져오는 중 오류가 발생했습니다.'}
                </AlertDescription>
              </Alert>
            ) : waitingUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p>대기 중인 사용자가 없습니다.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>실명</TableHead>
                    <TableHead>닉네임</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>추천인</TableHead>
                    <TableHead>전화번호</TableHead>
                    <TableHead>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center">
                            이전 코호트 게시글 수
                            <HelpCircle className="h-4 w-4 ml-1" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>코호트 {selectedBoard?.cohort ? selectedBoard.cohort - 1 : '?'}에 작성한 게시글 수</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waitingUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.realName || '이름 없음'}
                      </TableCell>
                      <TableCell>{user.nickname || '닉네임 없음'}</TableCell>
                      <TableCell>{user.email || '이메일 없음'}</TableCell>
                      <TableCell>
                        {user.referrer ? (
                          user.referrer
                        ) : (
                          <span className="text-gray-400">null</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.phoneNumber ? (
                          user.phoneNumber
                        ) : (
                          <span className="text-gray-400">null</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.previousPostsCount !== null ? (
                          user.previousPostsCount
                        ) : (
                          <span className="text-gray-400">미확인</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectUser(user.uid)}
                            disabled={rejectUserMutation.isPending && rejectUserMutation.variables === user.uid}
                          >
                            {rejectUserMutation.isPending && rejectUserMutation.variables === user.uid ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4 mr-1" />
                            )}
                            거부
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApproveUser(user.uid)}
                            disabled={approveUserMutation.isPending && approveUserMutation.variables === user.uid}
                          >
                            {approveUserMutation.isPending && approveUserMutation.variables === user.uid ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 mr-1" />
                            )}
                            승인
                          </Button>
                        </div>
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
      )}
    </div>
  )
}
