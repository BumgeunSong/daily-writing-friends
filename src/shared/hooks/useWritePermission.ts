import { captureException } from '@sentry/react';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/firebase";
import { User } from "@/user/model/User";
import { getReadSource, getSupabaseClient } from "@/shared/api/supabaseClient";

export default function useWritePermission(userId: string | null, boardId: string) {
    const noUserIdError = userId === null ? new Error('유저 ID가 존재하지 않아 유저 데이터를 불러올 수 없습니다.') : null;

    const { data: writePermission, isLoading, error } = useQuery<boolean>(
        ['writePermission', userId, boardId],
        async () => {
            if (userId === null) {
                throw noUserIdError;
            }

            const readSource = getReadSource();

            if (readSource === 'supabase') {
                // Query from Supabase user_board_permissions table
                const supabase = getSupabaseClient();
                const { data, error } = await supabase
                    .from('user_board_permissions')
                    .select('permission')
                    .eq('user_id', userId)
                    .eq('board_id', boardId)
                    .single();

                if (error) {
                    // If no row exists, permission is null/undefined -> return false
                    if (error.code === 'PGRST116') {
                        return false;
                    }
                    throw error;
                }

                return data?.permission === 'write';
            } else {
                // get user document from Firestore
                const userDocRef = doc(firestore, 'users', userId);
                const userDoc = await getDoc(userDocRef);
                const user = userDoc.data() as User;
                return user.boardPermissions[boardId] === 'write';
            }
        },
        {
            enabled: userId !== null,
            staleTime: 1000 * 60 * 5, // 5 minutes
            cacheTime: 1000 * 60 * 10, // 10 minutes
            onError: (error) => {
                console.error(error);
                captureException(error);
            }
        }
    );

    return { writePermission, isLoading, error: error || noUserIdError };
}