// call api to get writing stats
// return writing stats
import { useQuery } from '@tanstack/react-query'
import { WritingStats } from "@/types/WritingStats"

interface WritingStatsResponse {
    status: 'success' | 'error';
    data: {
        writingStats: WritingStats[];
    };
    error?: {
        message: string;
    };
}

const fetchWritingStats = async (): Promise<WritingStats[]> => {
    try {
        const response = await fetch('https://getwritingstats-ifrsorhslq-uc.a.run.app/', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            mode: 'cors',
            credentials: 'omit'
        });

    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const json: WritingStatsResponse = await response.json();

    if (json.status === 'error') {
        throw new Error(json.error?.message || 'Unknown error');
    }

    // writingStats 배열이 없는 경우 빈 배열 반환
    return json.data.writingStats || [];
}

export const useWritingStats = () => {
    const { 
        data: writingStats = [], // 기본값으로 빈 배열 설정
        isLoading, 
        error,
        isError
    } = useQuery<WritingStats[], Error>({
        queryKey: ['writingStats'],
        queryFn: fetchWritingStats,
        staleTime: 1000 * 60 * 1, // 1 minute
        cacheTime: 1000 * 60 * 3, // 3 minutes,
        retry: 1, // 실패시 1번만 재시도
    });

    return { 
        writingStats, 
        isLoading,
        isError,
        error: error as Error | null,
    }
}