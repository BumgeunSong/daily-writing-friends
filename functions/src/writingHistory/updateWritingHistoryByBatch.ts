import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { Post } from '../shared/types/Post';
import { WritingHistory } from './WritingHistory';

export const updateWritingHistoryByBatch = onRequest(async (req, res) => {
    try {
        const boardId = validateAndGetBoardId(req);
        if (!boardId) {
             res.status(400).json({ error: 'boardId is required' });
             return
        }

        const db = admin.firestore();
        const result = await processWritingHistoryUpdate(db, boardId);
        res.status(200).json(result);
    } catch (error) {
        handleError(error, res);
    }
});

const validateAndGetBoardId = (req: Request): string | null => {
    const boardId = req.query.boardId as string;
    return boardId || null;
};

const processWritingHistoryUpdate = async (
    db: admin.firestore.Firestore,
    boardId: string
) => {
    const posts = await fetchBoardPosts(db, boardId);
    if (posts.length === 0) {
        return {
            message: 'No posts found in this board',
            boardId
        };
    }

    const postsByAuthor = groupPostsByAuthor(posts);
    const [batch, operations] = await createBatchOperations(db, postsByAuthor);
    await executeBatchOperations(batch, operations);

    return await generateVerificationResult(db, postsByAuthor, {
        posts,
        operations
    });
};

const generateVerificationResult = async (
    db: admin.firestore.Firestore,
    postsByAuthor: Map<string, Post[]>,
    metadata: {
        posts: Post[],
        operations: Array<() => void>
    }
) => {
    const verificationResults = await collectVerificationResults(db, postsByAuthor);
    
    return {
        status: 'success',
        summary: {
            postsProcessed: metadata.posts.length,
            authorsProcessed: postsByAuthor.size,
            operationsCreated: metadata.operations.length,
            timestamp: new Date().toISOString()
        },
        verification: {
            results: verificationResults,
            totalDocuments: verificationResults.reduce(
                (sum, result) => sum + result.documentsCount,
                0
            )
        }
    };
};

const collectVerificationResults = async (
    db: admin.firestore.Firestore,
    postsByAuthor: Map<string, Post[]>
): Promise<Array<{
    authorId: string;
    documentsCount: number;
    documents: Array<{ id: string; data: any }>;
}>> => {
    const results = [];
    
    for (const [authorId] of postsByAuthor.entries()) {
        const writingHistories = await db
            .collection('users')
            .doc(authorId)
            .collection('writingHistories')
            .get();

        results.push({
            authorId,
            documentsCount: writingHistories.size,
            documents: writingHistories.docs.map(doc => ({
                id: doc.id,
                data: doc.data()
            }))
        });
    }

    return results;
};

const handleError = (error: unknown, res: Response) => {
    console.error('Error updating writing history:', error);
    res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
    });
};

// 게시물의 WritingHistory 데이터 생성
export const createWritingHistoryData = (post: Post): WritingHistory => {
    if (!post.createdAt) {
        throw new Error(`createdAt is required. But post ${post.id} has no createdAt`);
    }

    return {
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
            const updatedData = {
                createdAt: newData.createdAt,
                post: {
                    ...existingDoc.data().post,
                    contentLength: newData.post.contentLength
                }
            };
            operations.push(() => batch.update(existingDoc.ref, updatedData));
        } else {
            const newDocRef = writingHistoriesRef.doc();
            
            operations.push(() => {
                return batch.set(newDocRef, newData);
            });
        }
    }
    return operations;
};


// 메인 배치 작업 생성 함수
const createBatchOperations = async (
    db: admin.firestore.Firestore,
    postsByAuthor: Map<string, Post[]>
): Promise<[admin.firestore.WriteBatch, Array<() => void>]> => {
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

    return [batch, operations];
};

// 배치 작업 실행 함수 수정
const executeBatchOperations = async (
    batch: admin.firestore.WriteBatch,
    operations: Array<() => void>
) => {
    for (const operation of operations) {
        try {
            operation();
        } catch (error) {
            console.error('Operation failed:', error);
            throw error;
        }
    }

    try {
        await batch.commit();
    } catch (error) {
        console.error('Batch commit failed:', error);
        throw error;
    }
};
