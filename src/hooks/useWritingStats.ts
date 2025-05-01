// call api to get writing stats
// return writing stats
import * as Sentry from '@sentry/react';
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
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const json: WritingStatsResponse = await response.json();

        if (json.status === 'error') {
            throw new Error(json.error?.message || 'Server returned an error');
        }

        if (!json.data?.writingStats) {
            throw new Error('Invalid response format: missing writingStats');
        }

        return json.data.writingStats;
    } catch (error) {
        // 더 자세한 에러 정보 제공
        const errorMessage = error instanceof Error 
            ? error.message 
            : 'Failed to fetch writing stats';

        // Sentry 에러 보고 추가
        if (typeof Sentry !== 'undefined') {
            Sentry.captureException(error, {
                tags: {
                    url: 'getwritingstats-endpoint',
                },
                extra: {
                    errorMessage,
                    timestamp: new Date().toISOString(),
                },
            });
        }
        throw new Error(errorMessage);
    }
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
        cacheTime: 1000 * 60 * 10, // 10 minutes,
        retry: 1, // 실패시 1번만 재시도
    });

    return { 
        writingStats, 
        isLoading,
        isError,
        error: error as Error | null,
    }
}