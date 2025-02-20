import { onRequest } from "firebase-functions/v2/https";
import admin from "../admin";
import { Post } from "../types/Post";
import { Comment } from "../types/Comment";
import { Reply } from "../types/Reply";
import { Replying } from "../types/Replying";

/**
 * updateReplying is a one-time migration function.
 * It takes a boardId as a parameter, fetches every reply in that board,
 * converts each into a "replying" record, and writes it to the corresponding user's subcollection.
*/
export const updateReplying = onRequest({
    timeoutSeconds: 540, // 9분 (최대 540초)
    memory: '1GiB'     // 메모리 할당량 증가
}, async (req, res) => {
    const boardId = req.query.boardId || req.body.boardId;
    if (!boardId) {
        res.status(400).json({ 
            error: "Missing boardId parameter." 
        });
        return;
    }

    console.log(`Reply migration started for boardId: ${boardId}`);

    try {
        // 배치 크기 설정
        const BATCH_SIZE = 500;
        
        const postsRef = admin.firestore()
            .collection('boards')
            .doc(boardId as string)
            .collection('posts');
        const postsSnapshot = await postsRef.get();

        let processedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        // 배치 처리를 위한 배열
        let batch = admin.firestore().batch();
        let operationCount = 0;

        // 각 게시글 처리
        for (const postDoc of postsSnapshot.docs) {
            const postData = postDoc.data() as Post;
            const postId = postData.id;
            const postTitle = postData.title;
            const postAuthorId = postData.authorId;

            // 게시글의 모든 댓글 가져오기
            const commentsRef = postDoc.ref.collection('comments');
            const commentsSnapshot = await commentsRef.get();

            // 각 댓글 처리
            for (const commentDoc of commentsSnapshot.docs) {
                const commentData = commentDoc.data() as Comment;
                const commentId = commentDoc.id;
                const commentAuthorId = commentData.userId;

                // 댓글의 모든 답글 가져오기
                const repliesRef = commentDoc.ref.collection('replies');
                const repliesSnapshot = await repliesRef.get();
                console.log(`Found ${repliesSnapshot.size} reply(s) for comment ${commentId}`);

                // 각 답글 처리
                for (const replyDoc of repliesSnapshot.docs) {
                    const replyData = replyDoc.data() as Reply;
                    const replyId = replyDoc.id;
                    const authorId = replyData.userId;
                    const createdAt = replyData.createdAt;

                    if (!authorId) {
                        console.error(`Reply ${replyId} is missing an authorId. Skipping.`);
                        errorCount++;
                        continue;
                    }

                    try {
                        // 중복 체크: 같은 replyId를 가진 기록이 있는지 확인
                        const existingReplyings = await admin.firestore()
                            .collection('users')
                            .doc(authorId)
                            .collection('replyings')
                            .where('reply.id', '==', replyId)
                            .get();

                        if (!existingReplyings.empty) {
                            console.log(`Replying record for reply ${replyId} already exists. Skipping.`);
                            skippedCount++;
                            continue;
                        }

                        // Replying 데이터 모델 생성
                        const replyingData: Replying = {
                            board: { id: boardId as string },
                            post: { 
                                id: postId, 
                                title: postTitle,
                                authorId: postAuthorId
                            },
                            comment: { 
                                id: commentId,
                                authorId: commentAuthorId
                            },
                            reply: { id: replyId },
                            createdAt: createdAt
                        };

                        // 배치에 작업 추가
                        const docRef = admin.firestore()
                            .collection('users')
                            .doc(authorId)
                            .collection('replyings')
                            .doc(); // 자동 ID 생성

                        batch.set(docRef, replyingData);
                        operationCount++;
                        processedCount++;

                        // 배치 크기에 도달하면 커밋
                        if (operationCount >= BATCH_SIZE) {
                            await batch.commit();
                            batch = admin.firestore().batch();
                            operationCount = 0;
                            console.log(`Committed batch of ${BATCH_SIZE} operations`);
                        }

                    } catch (writeError) {
                        console.error(`Error migrating reply ${replyId} for author ${authorId}:`, writeError);
                        errorCount++;
                    }
                }
            }
        }

        // 남은 배치 커밋
        if (operationCount > 0) {
            await batch.commit();
            console.log(`Committed final batch of ${operationCount} operations`);
        }

        console.log(`Migration completed for board ${boardId}:
            ${processedCount} reply(s) processed,
            ${skippedCount} reply(s) skipped (duplicates),
            ${errorCount} error(s).`
        );

        res.status(200).json({
            message: `Migration completed for board ${boardId}`,
            stats: {
                processed: processedCount,
                skipped: skippedCount,
                errors: errorCount
            }
        });
    } catch (error) {
        console.error(`Error during reply migration for board ${boardId}:`, error);
        res.status(500).json({
            error: `Error during reply migration for board ${boardId}`,
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
