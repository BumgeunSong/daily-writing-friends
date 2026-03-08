'use client'

import { useState, useEffect } from 'react'
import { fetchBoardsMapped } from '@/apis/supabase-reads'
import { Eye, AlertCircle, RefreshCw, Newspaper, Plus, Settings2, CheckCircle2, Clock } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useRouter } from 'next/navigation'
import { useCreateUpcomingBoard } from '@/hooks/useCreateUpcomingBoard'
import { useRemoteConfig } from '@/hooks/useRemoteConfig'
import { toast } from 'sonner'

export default function BoardsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { createNextCohort, isCreating } = useCreateUpcomingBoard()
  const {
    activeBoardId,
    upcomingBoardId,
    isLoading: configLoading,
    isUpdating,
    isRefreshing,
    updateBoards,
    forceRefresh,
    validateBoards,
    clearError
  } = useRemoteConfig()

  // 편집 모드 상태
  const [isEditingConfig, setIsEditingConfig] = useState(false)
  const [tempActiveId, setTempActiveId] = useState('')
  const [tempUpcomingId, setTempUpcomingId] = useState('')

  // 게시판 목록 쿼리
  const { 
    data: boards = [], 
    isLoading: boardsLoading, 
    error: boardsError 
  } = useQuery({
    queryKey: ['boards'],
    queryFn: fetchBoardsMapped,
    staleTime: 5 * 60 * 1000, // 5분
  })

  // Remote Config 값이 변경되면 임시 값 업데이트
  useEffect(() => {
    if (!isEditingConfig) {
      setTempActiveId(activeBoardId)
      setTempUpcomingId(upcomingBoardId)
    }
  }, [activeBoardId, upcomingBoardId, isEditingConfig])

  // 게시판 상세 페이지로 이동
  const handleViewBoard = (boardId: string) => {
    router.push(`/admin/boards/${boardId}`)
  }

  // 새 코호트 생성
  const handleCreateCohort = async () => {
    try {
      await createNextCohort()
      toast.success('새 코호트가 성공적으로 생성되었습니다.')
    } catch (error) {
      console.error('Error creating cohort:', error)
      toast.error('코호트 생성 중 오류가 발생했습니다.')
    }
  }

  // 활성 게시판 설정 저장
  const handleSaveConfig = async () => {
    try {
      // Force refresh to get latest values before updating
      await forceRefresh()

      // Small delay to ensure values are propagated
      await new Promise(resolve => setTimeout(resolve, 100))

      updateBoards(
        {
          activeBoardId: tempActiveId,
          upcomingBoardId: tempUpcomingId
        },
        {
          onSuccess: () => {
            toast.success('활성 게시판 설정이 저장되었습니다.')
            setIsEditingConfig(false)
            // Refresh again after save to ensure UI shows latest values
            forceRefresh()
          },
          onError: (error) => {
            console.error('Error saving config:', error)
            toast.error('설정 저장 중 오류가 발생했습니다.')
          }
        }
      )
    } catch (error) {
      console.error('Error refreshing config before save:', error)
      toast.error('설정을 새로고침하는 중 오류가 발생했습니다.')
    }
  }

  // 편집 취소
  const handleCancelEdit = () => {
    setTempActiveId(activeBoardId)
    setTempUpcomingId(upcomingBoardId)
    setIsEditingConfig(false)
    clearError()
  }

  // 유효성 검사
  const isValid = validateBoards(tempActiveId, tempUpcomingId)

  if (boardsLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array(5).fill(0).map((_, i) => (
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
            onClick={() => queryClient.invalidateQueries({ queryKey: ['boards'] })}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            다시 시도
          </Button>
        </div>
      </Alert>
    )
  }

  // 활성/예정 게시판 정보 가져오기
  const activeBoard = boards.find(b => b.id === activeBoardId)
  const upcomingBoard = boards.find(b => b.id === upcomingBoardId)
  const tempActiveBoard = boards.find(b => b.id === tempActiveId)
  const tempUpcomingBoard = boards.find(b => b.id === tempUpcomingId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">게시판 관리</h1>
        <p className="text-muted-foreground">
          모든 게시판을 조회하고 관리합니다.
        </p>
      </div>

      {/* 활성 게시판 관리 카드 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                활성 게시판 관리
              </CardTitle>
              <CardDescription>
                현재 진행 중인 게시판과 다음 예정 게시판을 설정합니다.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {!isEditingConfig && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={forceRefresh}
                    disabled={isRefreshing || configLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      // Refresh before entering edit mode to get latest values
                      await forceRefresh()
                      setIsEditingConfig(true)
                    }}
                    disabled={configLoading || isRefreshing}
                  >
                    편집
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* 현재 진행 중 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                현재 진행 중
              </Label>
              {isEditingConfig ? (
                <>
                  <Select value={tempActiveId || "none"} onValueChange={(value) => setTempActiveId(value === "none" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="게시판을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">없음</SelectItem>
                      {boards.map(board => (
                        <SelectItem key={board.id} value={board.id}>
                          {board.title} {board.cohort && `(${board.cohort}기)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {tempActiveBoard && (
                    <div className="text-sm text-muted-foreground pl-1">
                      {tempActiveBoard.description}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-lg border bg-muted/50 p-3">
                  {activeBoard ? (
                    <>
                      <div className="font-medium">{activeBoard.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {activeBoard.description}
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">설정되지 않음</div>
                  )}
                </div>
              )}
            </div>

            {/* 다음 예정 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                다음 예정
              </Label>
              {isEditingConfig ? (
                <>
                  <Select value={tempUpcomingId || "none"} onValueChange={(value) => setTempUpcomingId(value === "none" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="게시판을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">없음</SelectItem>
                      {boards.map(board => (
                        <SelectItem key={board.id} value={board.id}>
                          {board.title} {board.cohort && `(${board.cohort}기)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {tempUpcomingBoard && (
                    <div className="text-sm text-muted-foreground pl-1">
                      {tempUpcomingBoard.description}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-lg border bg-muted/50 p-3">
                  {upcomingBoard ? (
                    <>
                      <div className="font-medium">{upcomingBoard.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {upcomingBoard.description}
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">설정되지 않음</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 유효성 검사 오류 */}
          {isEditingConfig && !isValid && tempActiveId && tempUpcomingId && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                현재 진행 중인 게시판과 다음 예정 게시판은 달라야 합니다.
              </AlertDescription>
            </Alert>
          )}

          {/* 액션 버튼 */}
          {isEditingConfig && (
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleSaveConfig}
                disabled={!isValid || isUpdating || isRefreshing}
              >
                {isRefreshing ? '새로고침 중...' : isUpdating ? '저장 중...' : '저장'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancelEdit}
                disabled={isUpdating}
              >
                취소
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 게시판 목록 카드 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                게시판 목록
                <span className="ml-2 text-muted-foreground font-normal text-sm">
                  ({boards.length}개)
                </span>
              </CardTitle>
              <CardDescription>
                코호트별로 정렬된 게시판 목록입니다.
              </CardDescription>
            </div>
            <Button 
              onClick={handleCreateCohort}
              disabled={isCreating}
            >
              <Plus className="mr-2 h-4 w-4" />
              {isCreating ? '생성 중...' : '새 코호트 생성'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {boards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Newspaper className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p>등록된 게시판이 없습니다.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">코호트</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead>시작일</TableHead>
                  <TableHead>종료일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boards.map((board) => {
                  const firstDay = board.firstDay instanceof Date ? board.firstDay : null
                  const lastDay = board.lastDay instanceof Date ? board.lastDay : null

                  return (
                    <TableRow key={board.id}>
                      <TableCell className="font-medium text-center">
                        {board.cohort ? (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {board.cohort}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {board.title}
                          {board.id === activeBoardId && (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              진행 중
                            </Badge>
                          )}
                          {board.id === upcomingBoardId && (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                              예정
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="truncate text-muted-foreground">
                          {board.description || '설명 없음'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {firstDay ? (
                          <div>
                            <div className="text-sm">
                              {firstDay.toLocaleDateString('ko-KR')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {firstDay.toLocaleDateString('ko-KR', { 
                                weekday: 'short'
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">날짜 없음</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lastDay ? (
                          <div>
                            <div className="text-sm">
                              {lastDay.toLocaleDateString('ko-KR')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {lastDay.toLocaleDateString('ko-KR', { 
                                weekday: 'short'
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">날짜 없음</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewBoard(board.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          상세보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
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