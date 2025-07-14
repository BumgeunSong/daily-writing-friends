import { onDocumentCreated } from "firebase-functions/v2/firestore";
import admin from "../admin";
import { Post } from "../types/Post";
import { Posting } from "../types/Posting";
import { handlePostingRecovery, updateRecoveryStatusAfterPosting } from "./postingRecoveryHandler";

export const createPosting = onDocumentCreated(
  'boards/{boardId}/posts/{postId}',
  async (event) => {
    
    const postData = event.data?.data() as Post;
    if (!postData) {
      console.error('No post data found.');
      return null;
    }

    // Destructure necessary fields
    const boardId = postData.boardId;
    const postId = postData.id;
    const postTitle = postData.title;
    const content = postData.content || '';
    const createdAt = postData.createdAt;
    const authorId = postData.authorId;

    if (!authorId) {
      console.error('Post is missing an authorId.');
      return null;
    }

    // Compute the content length for our posting record.
    const contentLength = content.length;
    
    // Handle recovery logic
    const { postingCreatedAt, isRecovered } = await handlePostingRecovery(authorId, createdAt);

    // Build the posting data model.
    const postingData: Posting = {
      board: { id: boardId },
      post: { id: postId, title: postTitle, contentLength: contentLength },
      createdAt: postingCreatedAt,
      ...(isRecovered && { isRecovered: true }),
    };

    try {
      // Create the posting record
      await admin.firestore()
        .collection('users')
        .doc(authorId)
        .collection('postings')
        .add(postingData);

      console.log(`Created posting activity for user ${authorId} for post ${postId}${isRecovered ? ' (recovery post)' : ''}`);

      // Update recovery status after posting creation
      const postCreatedAt = createdAt ? createdAt.toDate() : new Date();
      await updateRecoveryStatusAfterPosting(authorId, postCreatedAt);
      
    } catch (error) {
      console.error('Error writing posting activity:', error);
    }

    return null;
  });