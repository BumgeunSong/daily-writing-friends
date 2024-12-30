import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { Post } from '../types/Post';
import { WritingHistory } from '../types/WritingHistory';

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
// WritingHistory 문서 참조 생성
const createWritingHistoryRef = (
    db: admin.firestore.Firestore,
    authorId: string,
    postId: string
) => {
    return db
        .collection('users')
        .doc(authorId)
        .collection('writingHistory')
        .doc(postId);
};

// 기존 문서 데이터 가져오기
const getExistingDocument = async (
    docRef: admin.firestore.DocumentReference
) => {
    const doc = await docRef.get();
    return doc.exists ? doc.data() as WritingHistory : null;
};

// 업데이트할 데이터 생성
const createUpdatedData = (
    existingData: WritingHistory,
    newData: WritingHistory
): Partial<WritingHistory> => {
    return {
        ...existingData,
        day: newData.day,
        createdAt: newData.createdAt,
        post: {
            ...existingData.post,
            contentLength: newData.post.contentLength
        }
    };
};

// 단일 문서에 대한 배치 작업 생성
const createDocumentOperation = (
    batch: admin.firestore.WriteBatch,
    docRef: admin.firestore.DocumentReference,
    existingData: WritingHistory | null,
    newData: WritingHistory
): () => void => {
    if (existingData) {
        const updatedData = createUpdatedData(existingData, newData);
        return () => batch.update(docRef, updatedData);
    }
    return () => batch.set(docRef, newData);
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
        const docRef = createWritingHistoryRef(db, authorId, post.id);
        const existingData = await getExistingDocument(docRef);
        const newData = createWritingHistoryData(post);

        operations.push(
            createDocumentOperation(batch, docRef, existingData, newData)
        );
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
    batchSize: number = 500
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