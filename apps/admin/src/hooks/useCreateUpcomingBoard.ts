import { useState } from 'react'
import { adminQueryKeys, createBoard, getLastBoard } from '@/apis/admin-api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface CreateBoardData {
  cohort: number
  title: string
  description: string
  firstDay: Date
  lastDay: Date
}

function getNextMonday(fromDate: Date): Date {
  const date = new Date(fromDate)
  const day = date.getDay()
  const daysUntilMonday = day === 0 ? 1 : (8 - day) % 7 || 7
  date.setDate(date.getDate() + daysUntilMonday)
  date.setHours(0, 0, 0, 0)
  return date
}

function getFridayOf4thWeek(fromDate: Date): Date {
  const date = new Date(fromDate)
  date.setDate(date.getDate() + 25)
  date.setHours(23, 59, 59, 999)
  return date
}

function formatDateForDescription(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

export function useCreateUpcomingBoard() {
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)

  const createBoardMutation = useMutation({
    mutationFn: async (data: CreateBoardData) => {
      const board = await createBoard({
        id: crypto.randomUUID(),
        title: data.title,
        description: data.description,
        firstDay: data.firstDay.toISOString(),
        lastDay: data.lastDay.toISOString(),
        cohort: data.cohort,
      })
      return { id: board.id, ...data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.boards })
    }
  })

  const generateNextCohort = async (): Promise<CreateBoardData | null> => {
    try {
      setIsCreating(true)

      const lastBoard = await getLastBoard()

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
