import { captureException } from '@sentry/react';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/firebase";
import { User } from "@/user/model/User";

export default function useWritePermission(userId: string | null, boardId: string) {
    const noUserIdError = userId === null ? new Error('유저 ID가 존재하지 않아 유저 데이터를 불러올 수 없습니다.') : null;

    const { data: writePermission, isLoading, error } = useQuery<boolean>(
        ['writePermission', userId, boardId],
        async () => {
            if (userId === null) {
                throw noUserIdError;
            }
            // get user document
            const userDocRef = doc(firestore, 'users', userId);
            const userDoc = await getDoc(userDocRef);
            const user = userDoc.data() as User;
            return user.boardPermissions[boardId] === 'write';
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