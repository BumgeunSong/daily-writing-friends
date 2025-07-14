import { Timestamp } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import admin from "../admin";
import { Post } from "../types/Post";
import { Posting } from "../types/Posting";
import { calculateAndUpdateRecoveryStatus } from "../recoveryStatus/updateRecoveryStatus";

// Helper function to check if a date is a working day (Mon-Fri)
function isWorkingDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5; // Monday = 1, Friday = 5
}

// Helper function to get previous working day
function getPreviousWorkingDay(date: Date): Date {
  let prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 1);
  
  while (!isWorkingDay(prevDate)) {
    prevDate.setDate(prevDate.getDate() - 1);
  }
  
  return prevDate;
}

// Helper function to get current user's recovery status
async function getUserRecoveryStatus(userId: string): Promise<string> {
  const userRef = admin.firestore().collection('users').doc(userId);
  const userDoc = await userRef.get();
  const userData = userDoc.data();
  return userData?.recoveryStatus || 'none';
}

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
    
    // Convert createdAt to Date for timezone handling
    const postCreatedAt = createdAt ? createdAt.toDate() : new Date();

    // Get current user's recovery status
    const currentRecoveryStatus = await getUserRecoveryStatus(authorId);

    let postingCreatedAt = createdAt || Timestamp.now();
    let isRecovered = false;

    // If current status is 'partial', this is the 2nd post for recovery
    if (currentRecoveryStatus === 'partial') {
      // This is the 2nd post today and we're in recovery mode
      const prevWorkingDay = getPreviousWorkingDay(postCreatedAt);
      // Set the posting date to the previous working day for recovery
      postingCreatedAt = Timestamp.fromDate(prevWorkingDay);
      isRecovered = true;
      
      console.log(`Recovery post detected for user ${authorId}: posting will be backdated to ${prevWorkingDay.toISOString()}`);
    }

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

      // Calculate and update recovery status after posting creation
      await calculateAndUpdateRecoveryStatus(authorId, postCreatedAt);
      
    } catch (error) {
      console.error('Error writing posting activity:', error);
    }

    return null;
  });