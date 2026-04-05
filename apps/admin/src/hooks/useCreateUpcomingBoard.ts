import { useState } from 'react'
import { fetchLastBoard } from '@/apis/supabase-reads'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabase'

interface CreateBoardData {
  cohort: number
  title: string
  description: string
  firstDay: Date
  lastDay: Date
}

/**
 * 다음 월요일(KST)을 반환하는 함수
 */
function getNextMonday(fromDate: Date): Date {
  const date = new Date(fromDate)
  const day = date.getDay()
  const daysUntilMonday = day === 0 ? 1 : (8 - day) % 7 || 7
  date.setDate(date.getDate() + daysUntilMonday)
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * 주어진 날짜로부터 4주차 금요일을 반환하는 함수
 */
function getFridayOf4thWeek(fromDate: Date): Date {
  const date = new Date(fromDate)
  // 월요일(0일차)부터 4주차 금요일까지는 25일
  // 1주차: 0-4일, 2주차: 7-11일, 3주차: 14-18일, 4주차: 21-25일
  date.setDate(date.getDate() + 25)
  date.setHours(23, 59, 59, 999)
  return date
}

/**
 * 날짜를 YYYY.MM.DD 형식으로 포맷하는 함수
 */
function formatDateForDescription(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

/**
 * 새로운 upcoming board를 생성하는 커스텀 훅
 */
export function useCreateUpcomingBoard() {
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)

  const createBoardMutation = useMutation({
    mutationFn: async (data: CreateBoardData) => {
      const supabase = getSupabaseClient()
      const { data: inserted, error } = await supabase.from('boards').insert({
        id: crypto.randomUUID(),
        title: data.title,
        description: data.description,
        first_day: data.firstDay.toISOString(),
        last_day: data.lastDay.toISOString(),
        cohort: data.cohort,
      }).select('id').single()
      if (error) throw error
      if (!inserted) throw new Error('Failed to create board: no data returned from Supabase.')

      return { id: inserted.id, ...data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
    }
  })

  /**
   * 마지막 코호트 정보를 가져와서 다음 코호트 데이터를 자동 생성
   */
  const generateNextCohort = async (): Promise<CreateBoardData | null> => {
    try {
      setIsCreating(true)
      
      const lastBoard = await fetchLastBoard()

      if (!lastBoard) {
        const firstDay = getNextMonday(new Date())
        const lastDay = getFridayOf4thWeek(firstDay)
        return {
          cohort: 1,
          title: '매일 글쓰기 프렌즈 1기',
          description: `${formatDateForDescription(firstDay)} - ${formatDateForDescription(lastDay)}`,
          firstDay,
          lastDay,
        }
      }

      const nextCohort = (lastBoard.cohort || 0) + 1
      const baseDate = lastBoard.last_day ? new Date(lastBoard.last_day) : new Date()
      const firstDay = getNextMonday(baseDate)
      const lastDay = getFridayOf4thWeek(firstDay)

      return {
        cohort: nextCohort,
        title: `매일 글쓰기 프렌즈 ${nextCohort}기`,
        description: `${formatDateForDescription(firstDay)} - ${formatDateForDescription(lastDay)}`,
        firstDay,
        lastDay,
      }
    } catch (error) {
      console.error('Error generating next cohort:', error)
      return null
    } finally {
      setIsCreating(false)
    }
  }

  /**
   * 다음 코호트를 자동으로 생성하고 Firestore에 저장
   */
  const createNextCohort = async () => {
    const nextCohortData = await generateNextCohort()
    if (nextCohortData) {
      return createBoardMutation.mutateAsync(nextCohortData)
    }
    throw new Error('Failed to generate next cohort data')
  }

  return {
    createNextCohort,
    generateNextCohort,
    createBoard: createBoardMutation.mutate,
    isCreating: isCreating || createBoardMutation.isPending,
    error: createBoardMutation.error
  }
}