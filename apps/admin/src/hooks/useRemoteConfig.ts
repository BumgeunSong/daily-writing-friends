import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminQueryKeys, getAppConfig, updateAppConfig } from '@/apis/admin-api'

interface UpdateBoardsParams {
  activeBoardId: string
  upcomingBoardId: string
}

export function useRemoteConfig() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const {
    data: configValues,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: adminQueryKeys.appConfig,
    queryFn: getAppConfig,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  })

  const forceRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.appConfig })
  }

  const updateMutation = useMutation({
    mutationFn: async ({ activeBoardId, upcomingBoardId }: UpdateBoardsParams) => {
      if (activeBoardId && upcomingBoardId && activeBoardId === upcomingBoardId) {
        throw new Error('현재 진행 중인 게시판과 다음 예정 게시판은 달라야 합니다.')
      }
      await updateAppConfig({ activeBoardId, upcomingBoardId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.appConfig })
      setError(null)
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const validateBoards = (activeBoardId: string, upcomingBoardId: string): boolean => {
    if (!activeBoardId && !upcomingBoardId) return true
    if (!activeBoardId || !upcomingBoardId) return true
    return activeBoardId !== upcomingBoardId
  }

  return {
    activeBoardId: configValues?.active_board_id || '',
    upcomingBoardId: configValues?.upcoming_board_id || '',
    isLoading,
    isUpdating: updateMutation.isPending,
    isRefreshing: isFetching,
    error,
    updateBoards: updateMutation.mutate,
    updateBoardsAsync: updateMutation.mutateAsync,
    refetch,
    forceRefresh,
    validateBoards,
    clearError: () => setError(null),
  }
}
