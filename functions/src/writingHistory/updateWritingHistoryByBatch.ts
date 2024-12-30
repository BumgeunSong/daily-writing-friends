import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { Post } from '../types/Post';
import { WritingHistory } from '../types/WritingHistory';
import { Timestamp } from 'firebase-admin/firestore';

export const updateWritingHistoryByBatch = onRequest(async (req, res) => {
    try {
        const db = admin.firestore();
        const boardId = req.query.boardId as string;

        if (!boardId) {
            res.status(400).json({
                error: 'boardId is required',
            });
            return;
        }

        const posts = await fetchBoardPosts(db, boardId);

        if (posts.length === 0) {
            res.status(200).json({
                message: 'No posts found in this board',
                boardId
            })
            return;
        }

        const postsByAuthor = groupPostsByAuthor(posts);
        const operations = await createBatchOperations(db, postsByAuthor);
        await executeBatchOperations(db, operations);

        res.status(200).json({
            message: 'Writing history updated successfully',
            boardId,
            totalAuthors: postsByAuthor.size,
            totalPosts: posts.length,
            operationsCount: operations.length
        })
    } catch (error) {
        console.error('Error updating writing history:', error);
        res.status(500).json({
            error: 'Failed to update writing history',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});


// 날짜 포맷 변환 (Date -> YYYY-MM-DD)
const formatDate = (createdAt: Timestamp): string => {
    return createdAt.toDate().toISOString().split('T')[0];
};

// 게시물의 WritingHistory 데이터 생성
const createWritingHistoryData = (post: Post): WritingHistory => {
    if (!post.createdAt) {
        throw new Error(`createdAt is required. But post ${post.id} has no createdAt`);
    }

    return {
        day: formatDate(post.createdAt),
        createdAt: post.createdAt,
        board: {
            id: post.boardId,
        },
        post: {
            id: post.id,
            contentLength: post.content.length,
        }
    };
};

// 게시판의 모든 게시물 조회
const fetchBoardPosts = async (
    db: admin.firestore.Firestore,
    boardId: string
): Promise<Post[]> => {
    const postsSnapshot = await db
        .collection('boards')
        .doc(boardId)
        .collection('posts')
        .get();

    return postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Post));
};

// 작성자별로 게시물 그룹화
const groupPostsByAuthor = (posts: Post[]): Map<string, Post[]> => {
    return posts.reduce((acc, post) => {
        if (!post.authorId) return acc;
        const authorPosts = acc.get(post.authorId) || [];
        acc.set(post.authorId, [...authorPosts, post]);
        return acc;
    }, new Map<string, Post[]>());
};

// WritingHistory 문서 참조 생성 및 기존 문서 찾기
const findExistingWritingHistory = async (
    db: admin.firestore.Firestore,
    authorId: string,
    boardId: string,
    postId: string
): Promise<admin.firestore.QueryDocumentSnapshot | null> => {
    const writingHistoriesRef = db
        .collection('users')
        .doc(authorId)
        .collection('writingHistories');

    const querySnapshot = await writingHistoriesRef
        .where('board.id', '==', boardId)
        .where('post.id', '==', postId)
        .get();

    return querySnapshot.empty ? null : querySnapshot.docs[0];
};

// 작성자별 배치 작업 생성
const createAuthorOperations = async (
    db: admin.firestore.Firestore,
    batch: admin.firestore.WriteBatch,
    authorId: string,
    posts: Post[]
): Promise<Array<() => void>> => {
    const operations: Array<() => void> = [];

    for (const post of posts) {
        const existingDoc = await findExistingWritingHistory(
            db,
            authorId,
            post.boardId,
            post.id
        );

        const writingHistoriesRef = db
            .collection('users')
            .doc(authorId)
            .collection('writingHistories');

        const newData = createWritingHistoryData(post);

        if (existingDoc) {
            // 기존 문서가 있는 경우 업데이트
            const updatedData = {
                day: newData.day,
                createdAt: newData.createdAt,
                post: {
                    ...existingDoc.data().post,
                    contentLength: newData.post.contentLength
                }
            };
            operations.push(() => 
                batch.update(existingDoc.ref, updatedData)
            );
        } else {
            // 새로운 문서 생성
            const newDocRef = writingHistoriesRef.doc();
            operations.push(() => 
                batch.set(newDocRef, newData)
            );
        }
    }

    return operations;
};

// 메인 배치 작업 생성 함수
const createBatchOperations = async (
    db: admin.firestore.Firestore,
    postsByAuthor: Map<string, Post[]>
): Promise<Array<() => void>> => {
    const batch = db.batch();
    const operations: Array<() => void> = [];

    for (const [authorId, posts] of postsByAuthor.entries()) {
        const authorOperations = await createAuthorOperations(
            db,
            batch,
            authorId,
            posts
        );
        operations.push(...authorOperations);
    }

    return operations;
};

// 배치 작업 실행 (청크 단위로 처리)
const executeBatchOperations = async (
    db: admin.firestore.Firestore,
    operations: Array<() => void>,
    batchSize = 500
) => {
    let batch = db.batch();
    let count = 0;

    for (const operation of operations) {
        operation();
        count++;

        if (count >= batchSize) {
            await batch.commit();
            batch = db.batch();
            count = 0;

            // 배치 작업 사이에 약간의 딜레이 추가 (선택사항)
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    if (count > 0) {
        await batch.commit();
    }
};