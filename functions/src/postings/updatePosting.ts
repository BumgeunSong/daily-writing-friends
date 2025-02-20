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
      res.status(400).json({ 
        error: "Missing boardId parameter." 
      });
      return;
    }
  
    console.log(`Migration started for boardId: ${boardId}`);
  
    try {
      // Reference to the posts subcollection for the given board
      const postsRef = admin.firestore()
        .collection('boards')
        .doc(boardId as string)
        .collection('posts');
      const postsSnapshot = await postsRef.get();
      console.log(`Found ${postsSnapshot.size} post(s) for board ${boardId}.`);
  
      let processedCount = 0;
      let skippedCount = 0;
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
  
        try {
          // 중복 체크: 같은 postId를 가진 기록이 있는지 확인
          const existingPostings = await admin.firestore()
            .collection('users')
            .doc(authorId)
            .collection('postings')
            .where('post.id', '==', postId)
            .get();
  
          if (!existingPostings.empty) {
            console.log(`Posting record for post ${postId} already exists. Skipping.`);
            skippedCount++;
            continue;
          }
  
          // Compute the content length. Default to empty string if missing.
          const content = postData.content || "";
          const contentLength = content.length;
  
          // Use the post's createdAt timestamp directly.
          const createdAt = postData.createdAt;
          // Build the posting data model
          const postingData: Posting = {
            board: { id: boardId as string },
            post: { id: postId, title: postTitle, contentLength: contentLength },
            createdAt: createdAt
          };
  
          // Write the posting record into the user's subcollection.
          await admin.firestore()
            .collection('users')
            .doc(authorId)
            .collection('postings')
            .add(postingData);
  
          console.log(`Successfully migrated post ${postTitle} for author ${authorId}`);
          processedCount++;
        } catch (writeError) {
          console.error(`Error migrating post ${postTitle} for author ${authorId}:`, writeError);
          errorCount++;
        }
      }
  
      console.log(`Migration completed for board ${boardId}:
        ${processedCount} post(s) processed,
        ${skippedCount} post(s) skipped (duplicates),
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
      console.error(`Error during migration for board ${boardId}:`, error);
      res.status(500).json({
        error: `Error during migration for board ${boardId}`,
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });