import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, Timestamp, Query, CollectionReference } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface ActivityCounts {
    commentings: number;
    replyings: number;
}

// 메인 훅
export const useActivity = (fromUserId: string) => {
    const { currentUser } = useAuth();
    const toUserId = currentUser?.uid;

    return useQuery({
        queryKey: ['activity', fromUserId, toUserId],
        queryFn: () => fetchActivityCounts(fromUserId, toUserId!),
        enabled: Boolean(fromUserId && toUserId),
        staleTime: 1000 * 60 * 1, // 1분
        cacheTime: 1000 * 60 * 30, // 30분
    });
};

// 순수 함수: 활동 데이터 가져오기
const fetchActivityCounts = async (fromUserId: string, toUserId: string): Promise<ActivityCounts> => {
    if (!fromUserId || !toUserId) {
        throw new Error('Both fromUserId and toUserId are required');
    }

    const timestampThreeDaysAgo = getThreeDaysAgoTimestamp();

    const commentingsRef = collection(firestore, 'users', fromUserId, 'commentings');
    const replyingsRef = collection(firestore, 'users', fromUserId, 'replyings');

    const commentingsQuery = createCommentingsQuery(commentingsRef, timestampThreeDaysAgo, toUserId);
    const replyingsQueryForPosts = createReplyingsQueryForPosts(replyingsRef, timestampThreeDaysAgo, toUserId);
    const replyingsQueryForComments = createReplyingsQueryForComments(replyingsRef, timestampThreeDaysAgo, toUserId);

    const [commentingsSnapshot, replyingsSnapshotForPosts, replyingsSnapshotForComments] = await Promise.all([
        getDocs(commentingsQuery),
        getDocs(replyingsQueryForPosts),
        getDocs(replyingsQueryForComments)
    ]);

    return {
        commentings: commentingsSnapshot.size,
        replyings: replyingsSnapshotForPosts.size + replyingsSnapshotForComments.size
    };
};


// 순수 함수: 3일 전 타임스탬프 생성
const getThreeDaysAgoTimestamp = (): Timestamp => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return Timestamp.fromDate(threeDaysAgo);
};

// 순수 함수: 댓글 쿼리 생성
const createCommentingsQuery = (
    commentingsRef: CollectionReference,
    timestampThreeDaysAgo: Timestamp,
    toUserId: string
): Query => {
    return query(
        commentingsRef,
        where('createdAt', '>=', timestampThreeDaysAgo),
        where('post.authorId', '==', toUserId)
    );
};

// 순수 함수: 게시글 작성자에 대한 답글 쿼리 생성
const createReplyingsQueryForPosts = (
    replyingsRef: CollectionReference,
    timestampThreeDaysAgo: Timestamp,
    toUserId: string
): Query => {
    return query(
        replyingsRef,
        where('createdAt', '>=', timestampThreeDaysAgo),
        where('post.authorId', '==', toUserId)
    );
};

// 순수 함수: 댓글 작성자에 대한 답글 쿼리 생성
const createReplyingsQueryForComments = (
    replyingsRef: CollectionReference,
    timestampThreeDaysAgo: Timestamp,
    toUserId: string
): Query => {
    return query(
        replyingsRef,
        where('createdAt', '>=', timestampThreeDaysAgo),
        where('comment.authorId', '==', toUserId)
    );
};
