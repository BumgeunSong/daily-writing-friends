import { onDocumentCreated } from "firebase-functions/v2/firestore";
import admin from "../shared/admin";
import { Post } from "../shared/types/Post";
import { Posting } from "./Posting";

export const createPosting = onDocumentCreated(
  'boards/{boardId}/posts/{postId}',
  async (event) => {
    const postData = event.data?.data() as Post;
    if (!postData) {
      console.error('No post data found in event');
      return null;
    }

    const { boardId, id: postId, title: postTitle, content = '', createdAt, authorId } = postData;

    if (!authorId) {
      console.error('Post is missing an authorId');
      return null;
    }

    const postingData: Posting = {
      board: { id: boardId },
      post: { id: postId, title: postTitle, contentLength: content.length },
      createdAt: createdAt || admin.firestore.Timestamp.now(),
    };

    try {
      await admin.firestore()
        .collection('users')
        .doc(authorId)
        .collection('postings')
        .add(postingData);
    } catch (error) {
      console.error('Error creating posting activity:', error);
    }

    return null;
  });