'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // 기본 staleTime을 5분으로 설정합니다.
        staleTime: 5 * 60 * 1000,
        // 기본 cacheTime을 1시간으로 설정합니다.
        gcTime: 60 * 60 * 1000,
        // 기본적으로 에러 발생 시 3번까지 재시도합니다.
        retry: 3,
        // 네트워크 재연결 시 자동으로 데이터를 다시 가져옵니다.
        refetchOnReconnect: true,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
} 