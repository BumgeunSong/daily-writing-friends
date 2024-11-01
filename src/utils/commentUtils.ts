import { firestore } from '../firebase';
import { collection, addDoc, doc, serverTimestamp } from 'firebase/firestore';

// Function to add a comment to a post
const addCommentToPost = async (postId: string, content: string, userId: string, userName: string, userProfileImage: string) => {
  try {
    const postRef = doc(firestore, 'posts', postId);
    await addDoc(collection(postRef, 'comments'), {
        content,
        userId,
        userName,
        userProfileImage,
        createdAt: serverTimestamp(),  
    });
    console.log('Comment added successfully');
  } catch (error) {
    console.error('Error adding comment:', error);
  }
};

// Function to add reply to a comment
const addReplyToComment = async (postId: string, commentId: string, content: string, userId: string, userName: string, userProfileImage: string) => {
  try {
    const postRef = doc(firestore, 'posts', postId);
    await addDoc(collection(postRef, 'comments', commentId, 'replies'), {
        content,
        userId,
        userName,
        userProfileImage,
        createdAt: serverTimestamp(),  
    });
    console.log('Reply added successfully');
  } catch (error) {
    console.error('Error adding reply:', error);
  }
}

export { addCommentToPost, addReplyToComment };