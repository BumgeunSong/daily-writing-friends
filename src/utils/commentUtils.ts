import { firestore } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

export const addCommentToPost = async (
  postId: string,
  content: string,
  userId: string,
  userName: string,
  userProfileImage: string
) => {
  try {
    const postRef = doc(firestore, "posts", postId);
    await addDoc(collection(postRef, "comments"), {
      content,
      userId,
      userName,
      userProfileImage,
      createdAt: serverTimestamp(),
    });
    console.log("Comment added successfully");
  } catch (error) {
    console.error("Error adding comment:", error);
  }
};

export const updateCommentToPost = async (
  postId: string,
  commentId: string,
  content: string
) => {
  try {
    const postRef = doc(firestore, "posts", postId);
    await updateDoc(doc(postRef, "comments", commentId), { content });
  } catch (error) {
    console.error("Error updating comment:", error);
  }
};

export const deleteCommentToPost = async (
  postId: string,
  commentId: string
) => {
  try {
    const postRef = doc(firestore, "posts", postId);
    await deleteDoc(doc(postRef, "comments", commentId));
  } catch (error) {
    console.error("Error deleting comment:", error);
  }
};

export const addReplyToComment = async (
  postId: string,
  commentId: string,
  content: string,
  userId: string,
  userName: string,
  userProfileImage: string
) => {
  try {
    const postRef = doc(firestore, "posts", postId);
    await addDoc(collection(postRef, "comments", commentId, "replies"), {
      content,
      userId,
      userName,
      userProfileImage,
      createdAt: serverTimestamp(),
    });
    console.log("Reply added successfully");
  } catch (error) {
    console.error("Error adding reply:", error);
  }
};

export const updateReplyToComment = async (
  postId: string,
  commentId: string,
  replyId: string,
  content: string
) => {
  try {
    const postRef = doc(firestore, "posts", postId);
    await updateDoc(doc(postRef, "comments", commentId, "replies", replyId), {
      content,
    });
  } catch (error) {
    console.error("Error updating reply:", error);
  }
};

export const deleteReplyToComment = async (
  postId: string,
  commentId: string,
  replyId: string
) => {
  try {
    const postRef = doc(firestore, "posts", postId);
    await deleteDoc(doc(postRef, "comments", commentId, "replies", replyId));
  } catch (error) {
    console.error("Error deleting reply:", error);
  }
};
