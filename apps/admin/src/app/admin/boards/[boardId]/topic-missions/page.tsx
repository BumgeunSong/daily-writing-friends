'use client'

import { fetchTopicMissions, TopicMissionEntry } from '@/apis/supabase-reads'
import { getSupabaseClient } from '@/lib/supabase'
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertCircle,
  Users,
  RefreshCw,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'

type ActionInFlight = { type: 'skip' | 'reorder'; id: string } | null

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:   { label: '대기 중',  variant: 'secondary' },
  assigned:  { label: '발표 예정', variant: 'default' },
  completed: { label: '완료',     variant: 'outline' },
  skipped:   { label: '건너뜀',   variant: 'destructive' },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_BADGE[status] ?? { label: status, variant: 'outline' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

function displayName(entry: TopicMissionEntry): string {
  return entry.users?.nickname ?? entry.users?.real_name ?? entry.user_id
}

export default function TopicMissionsPage() {
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const boardId = params.boardId as string

  const [isAdvancing, setIsAdvancing] = useState(false)
  const [actionInFlight, setActionInFlight] = useState<ActionInFlight>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const {
    data: missions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['topicMissions', boardId],
    queryFn: () => fetchTopicMissions(boardId),
    enabled: !!boardId,
    staleTime: 30 * 1000, // 30s
  })

  const hasPendingEntries = missions.some((m) => m.status === 'pending')
  const isPoolExhausted = missions.length > 0 && !hasPendingEntries

  const invalidateMissions = () =>
    queryClient.invalidateQueries({ queryKey: ['topicMissions', boardId] })

  const handleAdvance = async () => {
    setIsAdvancing(true)
    setActionError(null)
    try {
      const supabase = getSupabaseClient()
      const { error: fnError } = await supabase.functions.invoke(
        'assign-topic-presenter',
        { body: { board_id: boardId } },
      )
      if (fnError) throw fnError
      await invalidateMissions()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '발표자 지정에 실패했습니다.')
    } finally {
      setIsAdvancing(false)
    }
  }

  const handleSkip = async (mission: TopicMissionEntry) => {
    setActionInFlight({ type: 'skip', id: mission.id })
    setActionError(null)
    try {
      const supabase = getSupabaseClient()
      const wasAssigned = mission.status === 'assigned'

      const { error: updateError } = await supabase
        .from('topic_missions')
        .update({ status: 'skipped' })
        .eq('id', mission.id)
      if (updateError) throw updateError

      if (wasAssigned) {
        // Advance to next pending after skipping the assigned presenter
        const { error: fnError } = await supabase.functions.invoke(
          'assign-topic-presenter',
          { body: { board_id: boardId } },
        )
        if (fnError) throw fnError
      }

      await invalidateMissions()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '건너뛰기에 실패했습니다.')
    } finally {
      setActionInFlight(null)
    }
  }

  const handleReorder = async (mission: TopicMissionEntry, direction: 'up' | 'down') => {
    setActionInFlight({ type: 'reorder', id: mission.id })
    setActionError(null)
    try {
      const supabase = getSupabaseClient()
      const { error: rpcError } = await supabase.rpc('reorder_topic_mission', {
        p_board_id: boardId,
        p_entry_id: mission.id,
        p_direction: direction,
      })
      if (rpcError) throw rpcError
      await invalidateMissions()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '순서 변경에 실패했습니다.')
    } finally {
      setActionInFlight(null)
    }
  }

  const handleReset = async () => {
    setIsResetting(true)
    setActionError(null)
    try {
      const supabase = getSupabaseClient()
      const { error: updateError } = await supabase
        .from('topic_missions')
        .update({ status: 'pending' })
        .eq('board_id', boardId)
      if (updateError) throw updateError
      setResetDialogOpen(false)
      await invalidateMissions()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '초기화에 실패했습니다.')
    } finally {
      setIsResetting(false)
    }
  }

  const isActionDisabled = isAdvancing || actionInFlight !== null || isResetting

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">발표 주제 대기열을 불러오는 중...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          돌아가기
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>데이터를 불러올 수 없습니다</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
          </AlertDescription>
          <div className="mt-4">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              다시 시도
            </Button>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          게시판으로 돌아가기
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">발표 주제 대기열</h1>
        <p className="text-muted-foreground">
          게시판 발표자 순서를 관리합니다.
        </p>
      </div>

      {/* Pool exhaustion indicator */}
      {isPoolExhausted && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>이번 사이클 완료</AlertTitle>
          <AlertDescription>
            이번 사이클 완료 — 다음 지정 시 초기화됩니다
          </AlertDescription>
        </Alert>
      )}

      {/* Action error */}
      {actionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                대기열
                <span className="ml-2 text-muted-foreground font-normal text-sm">
                  ({missions.length}명)
                </span>
              </CardTitle>
              <CardDescription>
                순서대로 발표자를 지정합니다. 발표 완료 후 다음 발표자를 지정하세요.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setResetDialogOpen(true)}
                disabled={isActionDisabled || missions.length === 0}
              >
                대기열 초기화
              </Button>
              <Button
                onClick={handleAdvance}
                disabled={isActionDisabled || missions.length === 0}
              >
                {isAdvancing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    지정 중...
                  </>
                ) : (
                  '다음 발표자 지정'
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {missions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium">등록된 발표 주제가 없습니다.</p>
              <p className="text-sm mt-1">
                게시판 멤버들이 발표 주제를 등록하면 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">순서</TableHead>
                  <TableHead>닉네임</TableHead>
                  <TableHead>발표 주제</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {missions.map((mission, index) => {
                  const isFirst = index === 0
                  const isLast = index === missions.length - 1
                  const isThisSkipping =
                    actionInFlight?.type === 'skip' && actionInFlight.id === mission.id
                  const isThisReordering =
                    actionInFlight?.type === 'reorder' && actionInFlight.id === mission.id
                  const canSkip =
                    mission.status === 'pending' || mission.status === 'assigned'

                  return (
                    <TableRow key={mission.id}>
                      <TableCell className="font-mono text-muted-foreground">
                        {mission.order_index}
                      </TableCell>
                      <TableCell className="font-medium">
                        {displayName(mission)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {mission.topic}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={mission.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Reorder Up */}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleReorder(mission, 'up')}
                            disabled={isFirst || isActionDisabled}
                            title="위로 이동"
                          >
                            {isThisReordering ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <ArrowUp className="h-3 w-3" />
                            )}
                          </Button>

                          {/* Reorder Down */}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleReorder(mission, 'down')}
                            disabled={isLast || isActionDisabled}
                            title="아래로 이동"
                          >
                            {isThisReordering ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                          </Button>

                          {/* Skip */}
                          {canSkip && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7"
                              onClick={() => handleSkip(mission)}
                              disabled={isActionDisabled}
                            >
                              {isThisSkipping ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                '건너뛰기'
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reset confirmation dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>대기열 초기화</DialogTitle>
            <DialogDescription>
              모든 발표 주제 항목의 상태가 &ldquo;대기 중&rdquo;으로 초기화됩니다.
              현재 발표 예정인 발표자도 초기화됩니다. 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
              disabled={isResetting}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  초기화 중...
                </>
              ) : (
                '초기화 확인'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
