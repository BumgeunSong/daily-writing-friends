'use client'

import { useState } from 'react'
import {
  adminQueryKeys,
  createJustThreeQuestion,
  getJustThreeQuestions,
  updateJustThreeQuestion,
} from '@/apis/admin-api'
import { AlertCircle, MessageCircleQuestion, Plus, RefreshCw } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export default function JustThreeQuestionsPage() {
  const queryClient = useQueryClient()
  const [newQuestion, setNewQuestion] = useState('')

  const {
    data: questions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: adminQueryKeys.justThreeQuestions,
    queryFn: getJustThreeQuestions,
    staleTime: 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: createJustThreeQuestion,
    onSuccess: () => {
      setNewQuestion('')
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.justThreeQuestions })
      toast.success('질문이 추가되었습니다.')
    },
    onError: () => {
      toast.error('질문 추가 중 오류가 발생했습니다.')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateJustThreeQuestion(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.justThreeQuestions })
    },
    onError: () => {
      toast.error('질문 상태 변경 중 오류가 발생했습니다.')
    },
  })

  const handleCreate = () => {
    const question = newQuestion.trim()
    if (!question) return
    createMutation.mutate({ question })
  }

  if (isLoading) {
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

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>질문 목록을 불러올 수 없습니다</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : '서버 오류가 발생했습니다. 나중에 다시 시도해주세요.'}
        </AlertDescription>
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: adminQueryKeys.justThreeQuestions })}
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
        <h1 className="text-3xl font-bold tracking-tight">3줄쓰기 질문 관리</h1>
        <p className="text-muted-foreground">
          3줄쓰기 세션에서 노출되는 질문 풀을 관리합니다. 비활성화한 질문은 더 이상 사용자에게 노출되지 않습니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>질문 추가</CardTitle>
          <CardDescription>새 질문은 즉시 활성 상태로 추가되어 질문 풀에 포함됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="예: 오늘 가장 기억에 남는 순간은?"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
              }}
            />
            <Button onClick={handleCreate} disabled={!newQuestion.trim() || createMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              {createMutation.isPending ? '추가 중...' : '추가'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            질문 목록
            <span className="ml-2 text-muted-foreground font-normal text-sm">
              ({questions.length}개, 활성 {questions.filter((q) => q.is_active).length}개)
            </span>
          </CardTitle>
          <CardDescription>등록된 순서대로 정렬된 질문 목록입니다.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircleQuestion className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p>등록된 질문이 없습니다.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>질문</TableHead>
                  <TableHead className="w-[120px]">등록일</TableHead>
                  <TableHead className="w-[100px] text-right">활성</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell className={question.is_active ? '' : 'text-muted-foreground line-through'}>
                      {question.question}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(question.created_at).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={toggleMutation.isPending}
                        onClick={() =>
                          toggleMutation.mutate({ id: question.id, isActive: !question.is_active })
                        }
                      >
                        {question.is_active ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">활성</Badge>
                        ) : (
                          <Badge variant="secondary">비활성</Badge>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
