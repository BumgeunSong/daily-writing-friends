import { onRequest } from "firebase-functions/v2/https";
import admin from "../admin";
import { Commenting } from "../types/Commenting";
import { Post } from "../types/Post";
import { Comment } from "../types/Comment";
/**
 * updateCommenting is a one-time migration function.
 * It takes a boardId as a parameter, fetches every comment in that board,
 * converts each into a "commenting" record, and writes it to the corresponding user's subcollection.
*/
export const updateCommenting = onRequest({
    timeoutSeconds: 540, // 9분 (최대 540초)
    memory: '1GiB',     // 메모리 할당량 증가
}, async (req, res) => {
    // boardId를 쿼리 파라미터나 요청 본문에서 받기
    const boardId = req.query.boardId || req.body.boardId;
    if (!boardId) {
        res.status(400).json({ 
            error: "Missing boardId parameter." 
        });
        return;
    }

    console.log(`Comment migration started for boardId: ${boardId}`);

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

        // 각 게시글의 댓글들을 처리
        for (const postDoc of postsSnapshot.docs) {
            const postData = postDoc.data() as Post;
            const postId = postData.id;
            const postTitle = postData.title;
            const postAuthorId = postData.authorId;

            // 게시글의 모든 댓글 가져오기
            const commentsRef = postDoc.ref.collection('comments');
            const commentsSnapshot = await commentsRef.get();
            console.log(`Found ${commentsSnapshot.size} comment(s) for post ${postId}`);

            // 각 댓글 처리
            for (const commentDoc of commentsSnapshot.docs) {
                const commentData = commentDoc.data() as Comment;
                const commentId = commentDoc.id;
                const authorId = commentData.userId;
                const createdAt = commentData.createdAt;

                if (!authorId) {
                    console.error(`Comment ${commentId} is missing an authorId. Skipping.`);
                    errorCount++;
                    continue;
                }

                try {
                    // 중복 체크: 같은 commentId를 가진 기록이 있는지 확인
                    const existingCommentings = await admin.firestore()
                        .collection('users')
                        .doc(authorId)
                        .collection('commentings')
                        .where('comment.id', '==', commentId)
                        .get();

                    if (!existingCommentings.empty) {
                        console.log(`Commenting record for comment ${commentId} already exists. Skipping.`);
                        skippedCount++;
                        continue;
                    }

                    // Commenting 데이터 모델 생성
                    const commentingData: Commenting = {
                        board: { id: boardId as string },
                        post: { 
                            id: postId, 
                            title: postTitle,
                            authorId: postAuthorId
                        },
                        comment: { id: commentId },
                        createdAt: createdAt
                    };

                    // 배치에 작업 추가
                    const docRef = admin.firestore()
                        .collection('users')
                        .doc(authorId)
                        .collection('commentings')
                        .doc(); // 자동 ID 생성

                    batch.set(docRef, commentingData);
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
                    console.error(`Error migrating comment ${commentId} for author ${authorId}:`, writeError);
                    errorCount++;
                }
            }
        }

        // 남은 배치 커밋
        if (operationCount > 0) {
            await batch.commit();
            console.log(`Committed final batch of ${operationCount} operations`);
        }

        console.log(`Migration completed for board ${boardId}:
            ${processedCount} comment(s) processed,
            ${skippedCount} comment(s) skipped (duplicates),
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
        console.error(`Error during comment migration for board ${boardId}:`, error);
        res.status(500).json({
            error: `Error during comment migration for board ${boardId}`,
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
