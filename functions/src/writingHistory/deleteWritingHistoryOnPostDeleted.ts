import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import admin from "../shared/admin";
import { Post } from "../shared/types/Post";

export const deleteWritingHistoryOnPostDeleted = onDocumentDeleted(
    "boards/{boardId}/posts/{postId}",
    async (event) => {
        try {
            const db = admin.firestore();
            const post = event.data?.data() as Post;
            if (!post) {
                throw new Error('Post data is missing');
            }
            const authorId = post.authorId;
            if (!authorId) {
                throw new Error('Author ID is missing');
            }

            const writingHistoriesRef = db
                .collection('users')
                .doc(authorId)
                .collection('writingHistories');

            await writingHistoriesRef.doc().delete();
            console.info(`Writing history deleted for post ${post.id} by author ${authorId}`);
        } catch (error) {
            console.error('Error deleting writing history:', error);
        }
    }
);