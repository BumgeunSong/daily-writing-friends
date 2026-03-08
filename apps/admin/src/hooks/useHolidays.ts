import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchHolidayYears, fetchHolidayYear, saveHolidayYear, deleteHolidayYear } from '@/apis/holidays'
import { Holiday } from '@/types/firestore'

/**
 * Fetch all holiday years
 */
export function useHolidayYears() {
  return useQuery({
    queryKey: ['holidayYears'],
    queryFn: fetchHolidayYears,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch a specific year's holidays
 */
export function useHolidayYear(year: string | null) {
  return useQuery({
    queryKey: ['holidayYear', year],
    queryFn: () => year ? fetchHolidayYear(year) : null,
    enabled: !!year,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Create or update holiday year
 */
export function useSaveHolidayYear() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ year, items }: { year: string; items: Holiday[] }) =>
      saveHolidayYear(year, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidayYears'] })
      queryClient.invalidateQueries({ queryKey: ['holidayYear'] })
    },
  })
}

/**
 * Delete holiday year
 */
export function useDeleteHolidayYear() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (year: string) => deleteHolidayYear(year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidayYears'] })
      queryClient.invalidateQueries({ queryKey: ['holidayYear'] })
    },
  })
}
