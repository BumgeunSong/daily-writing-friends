import { firestore } from "@/firebase";
import { User } from "@/types/User";
import { doc, getDoc } from "firebase/firestore";
import { useQuery } from '@tanstack/react-query';
import Sentry from '@sentry/react';

const useWritePermission = (userId: string | null, boardId: string) => {
    if (userId === null) {
        const noUserIdError = new Error('유저 ID가 존재하지 않아 유저 데이터를 불러올 수 없습니다.');
        console.error(noUserIdError);
        Sentry.captureException(noUserIdError);
        return { writePermission: false, isLoading: false, error: noUserIdError };
    }

    const { data: writePermission, isLoading, error } = useQuery<boolean>(['writePermission', userId, boardId], async () => {
        // get user document
        const userDocRef = doc(firestore, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        const user = userDoc.data() as User;
        return user.boardPermissions[boardId] === 'write';
    }, {
        staleTime: 1000 * 60 * 5, // 5 minutes
        cacheTime: 1000 * 60 * 10, // 10 minutes
    });

    return { writePermission, isLoading, error };
}

export default useWritePermission;