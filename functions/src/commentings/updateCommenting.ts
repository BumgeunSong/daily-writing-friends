import { onRequest } from "firebase-functions/v2/https";
import admin from "../admin";
import { Commenting } from "../types/Commenting";

/**
 * updateCommenting is a one-time migration function.
 * It takes a boardId as a parameter, fetches every comment in that board,
 * converts each into a "commenting" record, and writes it to the corresponding user's subcollection.
*/
export const updateCommenting = onRequest(async (req, res) => {
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
        // 해당 게시판의 모든 게시글 가져오기
        const postsRef = admin.firestore()
            .collection('boards')
            .doc(boardId as string)
            .collection('posts');
        const postsSnapshot = await postsRef.get();

        let processedCount = 0;
        let errorCount = 0;

        // 각 게시글의 댓글들을 처리
        for (const postDoc of postsSnapshot.docs) {
            const postData = postDoc.data();
            const postId = postData.id;
            const postTitle = postData.title;
            const postAuthorId = postData.authorId;

            // 게시글의 모든 댓글 가져오기
            const commentsRef = postDoc.ref.collection('comments');
            const commentsSnapshot = await commentsRef.get();
            console.log(`Found ${commentsSnapshot.size} comment(s) for post ${postId}`);

            // 각 댓글 처리
            for (const commentDoc of commentsSnapshot.docs) {
                const commentData = commentDoc.data();
                const commentId = commentDoc.id;
                const authorId = commentData.authorId;
                const createdAt = commentData.createdAt;

                if (!authorId) {
                    console.error(`Comment ${commentId} is missing an authorId. Skipping.`);
                    errorCount++;
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

                try {
                    // 사용자의 commentings 서브컬렉션에 기록
                    await admin.firestore()
                        .collection('users')
                        .doc(authorId)
                        .collection('commentings')
                        .add(commentingData);

                    console.log(`Successfully migrated comment ${commentId} for author ${authorId}`);
                    processedCount++;
                } catch (writeError) {
                    console.error(`Error migrating comment ${commentId} for author ${authorId}:`, writeError);
                    errorCount++;
                }
            }
        }

        console.log(`Migration completed for board ${boardId}: ${processedCount} comment(s) processed, ${errorCount} error(s).`);
        res.status(200).json({
            message: `Migration completed for board ${boardId}`,
            stats: {
                processed: processedCount,
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
