import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { Post } from "../types/Post";
import { createWritingHistoryData } from "./updateWritingHistoryByBatch";
import admin from "../admin";

export const createWritingHistoryOnPostCreated = onDocumentCreated(
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
            const newData = createWritingHistoryData(post);

            const writingHistoriesRef = db
                .collection('users')
                .doc(authorId)
                .collection('writingHistories');

            await writingHistoriesRef.doc().set(newData);
            console.info(`Writing history created for post ${post.id} by author ${authorId}`);
        } catch (error) {
            console.error('Error creating writing history:', error);
        }
    }
);