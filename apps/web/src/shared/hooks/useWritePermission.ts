import { captureException } from '@sentry/react';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/shared/api/supabaseClient';

export default function useWritePermission(userId: string | null, boardId: string) {
    const noUserIdError = userId === null ? new Error('유저 ID가 존재하지 않아 유저 데이터를 불러올 수 없습니다.') : null;

    const { data: writePermission, isLoading, error } = useQuery<boolean>(
        ['writePermission', userId, boardId],
        async () => {
            if (userId === null) {
                throw noUserIdError;
            }

            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('user_board_permissions')
                .select('permission')
                .eq('user_id', userId)
                .eq('board_id', boardId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return false;
                }
                throw error;
            }

            return data?.permission === 'write';
        },
        {
            enabled: userId !== null,
            staleTime: 1000 * 60 * 5,
            cacheTime: 1000 * 60 * 10,
            onError: (error) => {
                console.error(error);
                captureException(error);
            }
        }
    );

    return { writePermission, isLoading, error: error || noUserIdError };
}
