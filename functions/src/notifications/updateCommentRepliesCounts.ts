import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/https';

// 이 함수는 모든 게시판의 모든 게시글의 모든 댓글의 모든 대댓글의 개수를 가장 최신 상태로 업데이트합니다.
export const updateCommentRepliesCounts = onRequest(async (req, res) => {
    const everyBoardDocs = (await admin.firestore().collection('boards').get()).docs;

    for (const boardDoc of everyBoardDocs) {
        const boardId = boardDoc.id;
        await updatePostCounts(boardId, boardDoc);
    }

    res.send('Comment/Reply counts updated successfully');
});

async function updatePostCounts(boardId: string, boardDoc: FirebaseFirestore.QueryDocumentSnapshot) {
    const everyPostDocs = (await boardDoc.ref.collection('posts').get()).docs;
    for (const postDoc of everyPostDocs) {
        const postId = postDoc.id;
        await updateCommentAndReplyCounts(boardId, postId, postDoc);
    }
}

async function updateCommentAndReplyCounts(boardId: string, postId: string, postDoc: FirebaseFirestore.QueryDocumentSnapshot) {
    const everyCommentDocs = (await postDoc.ref.collection('comments').get()).docs;
    const commentCount = everyCommentDocs.length;

    for (const commentDoc of everyCommentDocs) {
        const repliesCount = await getRepliesCount(commentDoc);
        try {
            await admin.firestore().doc(`boards/${boardId}/posts/${postId}`).update({
                countOfComments: commentCount,
                countOfReplies: repliesCount
            });
        } catch (error) {
            console.error(`Error updating comment/reply counts on post ${postId} of board ${boardId}:`, error);
        }
    }
}

async function getRepliesCount(commentDoc: FirebaseFirestore.QueryDocumentSnapshot): Promise<number> {
    const everyReplyDocs = (await commentDoc.ref.collection('replies').get()).docs;
    return everyReplyDocs.length;
}