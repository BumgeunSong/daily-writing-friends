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

        console.log(`[Start] Fetching posts for boardId: ${boardId}`);
        const posts = await fetchBoardPosts(db, boardId);
        console.log(`[Posts] Found ${posts.length} posts`);

        if (posts.length === 0) {
            res.status(200).json({
                message: 'No posts found in this board',
                boardId
            })
            return;
        }

        // 포스트 데이터 로깅
        posts.forEach(post => {
            console.log(`[Post] ID: ${post.id}, AuthorId: ${post.authorId}, CreatedAt: ${post.createdAt}`);
        });

        const postsByAuthor = groupPostsByAuthor(posts);
        console.log(`[Authors] Grouped into ${postsByAuthor.size} authors`);

        // 작성자별 포스트 수 로깅
        for (const [authorId, authorPosts] of postsByAuthor.entries()) {
            console.log(`[Author] ${authorId} has ${authorPosts.length} posts`);
        }

        const operations = await createBatchOperations(db, postsByAuthor);
        console.log(`[Operations] Created ${operations.length} batch operations`);

        console.log('[Batch] Starting batch execution...');
        await executeBatchOperations(db, operations);
        console.log('[Batch] Completed batch execution');

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
    console.log(`[Author Operations] Processing ${posts.length} posts for author ${authorId}`);

    for (const post of posts) {
        console.log(`[Author Operations] Processing post ${post.id}`);
        
        const existingDoc = await findExistingWritingHistory(
            db,
            authorId,
            post.boardId,
            post.id
        );
        console.log(`[Author Operations] Existing doc for post ${post.id}: ${existingDoc ? 'found' : 'not found'}`);

        const writingHistoriesRef = db
            .collection('users')
            .doc(authorId)
            .collection('writingHistories');

        const newData = createWritingHistoryData(post);

        if (existingDoc) {
            console.log(`[Author Operations] Updating existing doc for post ${post.id}`);
            const updatedData = {
                day: newData.day,
                createdAt: newData.createdAt,
                post: {
                    ...existingDoc.data().post,
                    contentLength: newData.post.contentLength
                }
            };
            operations.push(() => batch.update(existingDoc.ref, updatedData));
        } else {
            console.log(`[Author Operations] Creating new doc for post ${post.id}`);
            const newDocRef = writingHistoriesRef.doc();
            operations.push(() => batch.set(newDocRef, newData));
        }
    }

    console.log(`[Author Operations] Created ${operations.length} operations for author ${authorId}`);
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
    let totalCommitted = 0;

    for (const operation of operations) {
        try {
            operation();
            count++;
            console.log(`[Batch] Added operation ${count} to current batch`);

            if (count >= batchSize) {
                console.log(`[Batch] Committing batch of ${count} operations...`);
                await batch.commit();
                totalCommitted += count;
                console.log(`[Batch] Successfully committed ${count} operations. Total: ${totalCommitted}`);
                
                batch = db.batch();
                count = 0;

                await new Promise(resolve => setTimeout(resolve, 1000));
                console.log('[Batch] Waited 1 second before next batch');
            }
        } catch (error) {
            console.error(`[Batch] Error in operation:`, error);
            throw error;
        }
    }

    if (count > 0) {
        console.log(`[Batch] Committing final batch of ${count} operations...`);
        try {
            await batch.commit();
            totalCommitted += count;
            console.log(`[Batch] Successfully committed final batch. Total operations: ${totalCommitted}`);
        } catch (error) {
            console.error(`[Batch] Error in final batch:`, error);
            throw error;
        }
    }
};