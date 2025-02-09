import { onRequest } from "firebase-functions/v2/https";
import admin from "../admin";
import { Posting } from "../types/Posting";

/**
 * updatePosting is a one-time migration function.
 * It takes a boardId as a parameter, fetches every post in that board,
 * converts each into a "posting" record, and writes it to the corresponding
 * user's activities (or postings) subcollection.
 */
export const updatePosting = onRequest(async (req, res) => {
    // Accept boardId as a query parameter (or in the request body)
    const boardId = req.query.boardId || req.body.boardId;
    if (!boardId) {
      res.status(400).send("Missing boardId parameter.");
      return;
    }
  
    console.log(`Migration started for boardId: ${boardId}`);
  
    try {
      // Reference to the posts subcollection for the given board
      const postsRef = admin.firestore().collection('boards').doc(boardId).collection('posts');
      const postsSnapshot = await postsRef.get();
      console.log(`Found ${postsSnapshot.size} post(s) for board ${boardId}.`);
  
      let processedCount = 0;
      let errorCount = 0;
  
      // Loop through each post document
      for (const postDoc of postsSnapshot.docs) {
        const postData = postDoc.data();
        const postId = postData.id;
        const postTitle = postData.title;
        const authorId = postData.authorId;
  
        if (!authorId) {
          console.error(`Post ${postId} is missing an authorId. Skipping.`);
          errorCount++;
          continue;
        }
  
        // Compute the content length. Default to empty string if missing.
        const content = postData.content || "";
        const contentLength = content.length;
  
        // Use the post's createdAt timestamp directly.
        const createdAt = postData.createdAt;
        // Build the posting data model
        const postingData: Posting = {
          board: { id: boardId },
          post: { id: postId, title: postTitle, contentLength: contentLength },
          createdAt: createdAt
        };
  
        try {
          // Write the posting record into the user's subcollection.
          await admin.firestore()
            .collection('users')
            .doc(authorId)
            .collection('postings')
            .add(postingData);
  
          console.log(`Successfully migrated post ${postTitle} for author ${authorId}.`);
          processedCount++;
        } catch (writeError) {
          console.error(`Error migrating post ${postTitle} for author ${authorId}:`, writeError);
          errorCount++;
        }
      }
  
      console.log(`Migration completed for board ${boardId}: ${processedCount} post(s) processed, ${errorCount} error(s).`);
      res.status(200).send(`Migration completed for board ${boardId}: ${processedCount} post(s) processed, ${errorCount} error(s).`);
    } catch (error) {
      console.error(`Error during migration for board ${boardId}:`, error);
      res.status(500).send(`Error during migration for board ${boardId}: ${error}`);
    }
  });