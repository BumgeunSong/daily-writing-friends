import { useQueryClient } from '@tanstack/react-query';

interface ClearCacheOptions {
    clearReactQuery?: boolean;
    clearBrowserCache?: boolean;
    clearLocalStorage?: boolean;
}

interface ClearCacheResult {
    success: boolean;
    error?: Error;
}

/**
 * 다양한 종류의 캐시를 삭제하는 커스텀 훅
 * @returns clearCache 함수
 */
export const useClearCache = () => {
    const queryClient = useQueryClient();
    const clearCache = async (
        options: ClearCacheOptions = {
            clearReactQuery: true,
            clearBrowserCache: true,
            clearLocalStorage: true,
        }
    ): Promise<ClearCacheResult> => {
        try {
            // React Query 캐시 초기화
            if (options.clearReactQuery) {
                queryClient.removeQueries();
            }

            // localStorage 초기화
            if (options.clearLocalStorage) {
                localStorage.clear();
            }

            // 브라우저 캐시 초기화
            if (options.clearBrowserCache && 'caches' in window) {
                const cacheKeys = await caches.keys();
                cacheKeys.map(key => caches.delete(key));
            }

            return { success: true };
        } catch (error) {
            console.error('캐시 삭제 오류:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error('캐시 삭제 중 오류가 발생했습니다.'),
            };
        }
    };

    return clearCache;
}