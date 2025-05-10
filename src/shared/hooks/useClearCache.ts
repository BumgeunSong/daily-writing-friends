import { useQueryClient } from '@tanstack/react-query';

interface ClearCacheOptions {
    clearReactQuery?: boolean;
    clearBrowserCache?: boolean;
    clearLocalStorage?: boolean;
    clearServiceWorker?: boolean;
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
            clearServiceWorker: true,
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

            // 서비스워커 강제 업데이트/재설치
            if (options.clearServiceWorker && 'serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    try {
                        await registration.unregister();
                        console.log('서비스워커가 성공적으로 해제되었습니다:', registration.scope);
                    } catch (swError) {
                        console.warn('서비스워커 해제 중 오류:', swError);
                    }
                }
                // 서비스워커 재등록 시도 (firebase-messaging-sw.js)
                try {
                    const swUrl = '/firebase-messaging-sw.js';
                    await navigator.serviceWorker.register(swUrl);
                    console.log('서비스워커가 재등록되었습니다:', swUrl);
                } catch (registerError) {
                    console.error('서비스워커 재등록 중 오류:', registerError);
                }
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