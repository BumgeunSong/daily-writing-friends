import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, Timestamp, Query, CollectionReference } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { firestore } from '@/firebase';

interface ActivityCounts {
    commentings: number;
    replyings: number;
}

// 메인 훅
export const useActivity = (fromUserId: string, fromDaysAgo: number) => {
    const { currentUser } = useAuth();
    const toUserId = currentUser?.uid;

    // 본인의 글일 때는 보여주지 않는다
    if (fromUserId === toUserId) {
        return { data: null, isLoading: false, error: null };
    }

    return useQuery({
        queryKey: ['activity', fromUserId, toUserId],
        queryFn: () => fetchActivityCounts(fromUserId, toUserId!, fromDaysAgo),
        enabled: Boolean(fromUserId && toUserId),
        staleTime: 1000 * 60 * 1, // 1분
        cacheTime: 1000 * 60 * 30, // 30분
    });
};

// 순수 함수: 활동 데이터 가져오기
const fetchActivityCounts = async (fromUserId: string, toUserId: string, fromDaysAgo: number): Promise<ActivityCounts> => {
    if (!fromUserId || !toUserId) {
        throw new Error('Both fromUserId and toUserId are required');
    }

    const timestampDaysAgo = getDaysAgoTimestamp(fromDaysAgo);

    const commentingsRef = collection(firestore, 'users', fromUserId, 'commentings');
    const replyingsRef = collection(firestore, 'users', fromUserId, 'replyings');

    const commentingsQuery = createCommentingsQuery(commentingsRef, timestampDaysAgo, toUserId);
    const replyingsQueryForPosts = createReplyingsQueryForPosts(replyingsRef, timestampDaysAgo, toUserId);
    const replyingsQueryForComments = createReplyingsQueryForComments(replyingsRef, timestampDaysAgo, toUserId);

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
const getDaysAgoTimestamp = (daysAgo: number): Timestamp => {
    const daysAgoFromNow = new Date();
    daysAgoFromNow.setDate(daysAgoFromNow.getDate() - daysAgo);
    return Timestamp.fromDate(daysAgoFromNow);
};

// 순수 함수: 댓글 쿼리 생성
const createCommentingsQuery = (
    commentingsRef: CollectionReference,
    timestampDaysAgo: Timestamp,
    toUserId: string
): Query => {
    return query(
        commentingsRef,
        where('createdAt', '>=', timestampDaysAgo),
        where('post.authorId', '==', toUserId)
    );
};

// 순수 함수: 게시글 작성자에 대한 답글 쿼리 생성
const createReplyingsQueryForPosts = (
    replyingsRef: CollectionReference,
    timestampDaysAgo: Timestamp,
    toUserId: string
): Query => {
    return query(
        replyingsRef,
        where('createdAt', '>=', timestampDaysAgo),
        where('post.authorId', '==', toUserId)
    );
};

// 순수 함수: 댓글 작성자에 대한 답글 쿼리 생성
const createReplyingsQueryForComments = (
    replyingsRef: CollectionReference,
    timestampDaysAgo: Timestamp,
    toUserId: string
): Query => {
    return query(
        replyingsRef,
        where('createdAt', '>=', timestampDaysAgo),
        where('comment.authorId', '==', toUserId)
    );
};
