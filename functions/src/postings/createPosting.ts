import { onDocumentCreated } from "firebase-functions/v2/firestore";
import admin from "../admin";
import { handlePostingRecovery, updateRecoveryStatusAfterPosting } from "./postingRecoveryHandler";
import { Post } from "../types/Post";
import { Posting } from "../types/Posting";

export const createPosting = onDocumentCreated(
  'boards/{boardId}/posts/{postId}',
  async (event) => {
    console.log(`[CreatePosting] 🎬 Function triggered for new post creation`);
    
    const postData = event.data?.data() as Post;
    if (!postData) {
      console.error('[CreatePosting] ❌ No post data found in event');
      return null;
    }

    // Destructure necessary fields
    const boardId = postData.boardId;
    const postId = postData.id;
    const postTitle = postData.title;
    const content = postData.content || '';
    const createdAt = postData.createdAt;
    const authorId = postData.authorId;

    console.log(`[CreatePosting] 📝 Post details:`, {
      boardId,
      postId,
      postTitle: postTitle.substring(0, 50) + (postTitle.length > 50 ? '...' : ''),
      contentLength: content.length,
      authorId,
      createdAt: createdAt?.toDate()?.toISOString()
    });

    if (!authorId) {
      console.error('[CreatePosting] ❌ Post is missing an authorId');
      return null;
    }

    // Compute the content length for our posting record.
    const contentLength = content.length;
    console.log(`[CreatePosting] Content length: ${contentLength} characters`);
    
    // Handle recovery logic
    console.log(`[CreatePosting] 🔄 Starting recovery logic check...`);
    const { postingCreatedAt, isRecovered } = await handlePostingRecovery(authorId, createdAt);
    console.log(`[CreatePosting] Recovery result: isRecovered=${isRecovered}, finalTimestamp=${postingCreatedAt.toDate().toISOString()}`);

    // Build the posting data model.
    const postingData: Posting = {
      board: { id: boardId },
      post: { id: postId, title: postTitle, contentLength: contentLength },
      createdAt: postingCreatedAt,
      ...(isRecovered && { isRecovered: true }),
    };

    console.log(`[CreatePosting] 📊 Posting data model:`, {
      boardId: postingData.board.id,
      postId: postingData.post.id,
      contentLength: postingData.post.contentLength,
      createdAt: postingData.createdAt.toDate().toISOString(),
      isRecovered: postingData.isRecovered || false
    });

    try {
      // Create the posting record
      console.log(`[CreatePosting] 💾 Writing posting record to Firestore...`);
      const docRef = await admin.firestore()
        .collection('users')
        .doc(authorId)
        .collection('postings')
        .add(postingData);

      console.log(`[CreatePosting] ✅ Created posting activity for user ${authorId} for post ${postId}${isRecovered ? ' (recovery post)' : ''}`);
      console.log(`[CreatePosting] Posting document ID: ${docRef.id}`);

      // Update recovery status after posting creation
      console.log(`[CreatePosting] 🔄 Updating recovery status after posting creation...`);
      // Important: Use original createdAt (when user actually posted) for status calculation,
      // NOT the potentially backdated postingCreatedAt used for the posting record
      const actualPostTime = createdAt ? createdAt.toDate() : new Date();
      console.log(`[CreatePosting] Using actual post time for status calculation: ${actualPostTime.toISOString()}`);
      console.log(`[CreatePosting] Posting record uses: ${postingCreatedAt.toDate().toISOString()} (${isRecovered ? 'backdated for recovery' : 'same as actual'})`);
      await updateRecoveryStatusAfterPosting(authorId, actualPostTime);
      
      console.log(`[CreatePosting] 🎉 All operations completed successfully for post ${postId}`);
      
    } catch (error) {
      console.error(`[CreatePosting] ❌ Error in posting creation process:`, error);
      console.error(`[CreatePosting] Error details:`, {
        authorId,
        postId,
        boardId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    console.log(`[CreatePosting] 🏁 Function execution completed for post ${postId}`);
    return null;
  });