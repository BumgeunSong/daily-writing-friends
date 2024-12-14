import { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { query, collection, orderBy, where, getDocs } from "firebase/firestore";
import { firestore } from "@/firebase";
import { Post } from "@/types/Posts";
import { useQuery } from "@tanstack/react-query";
import * as Sentry from '@sentry/react';

export const usePosts = (boardId: string, selectedAuthorId: string | null) => {
    return useQuery<Post[]>(
      ['posts', boardId, selectedAuthorId],
      () => fetchPosts(boardId, selectedAuthorId),
      {
        enabled: !!boardId,
        onError: (error) => {
            console.error("게시글 데이터를 불러오던 중 에러가 발생했습니다:", error);
            Sentry.captureException(error);
        },
        staleTime: 1000 * 30, // 30 seconds
        cacheTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: true, // Refetch when the window regains focus
      }
    );
  };

export async function fetchPosts(boardId: string, selectedAuthorId: string | null): Promise<Post[]> {
    let q = query(
      collection(firestore, `boards/${boardId}/posts`),
      orderBy('createdAt', 'desc'),
    );
  
    if (selectedAuthorId) {
      q = query(q, where('authorId', '==', selectedAuthorId));
    }
  
    const snapshot = await getDocs(q);
    const postsData = await Promise.all(snapshot.docs.map((doc) => mapDocToPost(doc, boardId)));
    return postsData;
  }
  
  async function mapDocToPost(docSnap: QueryDocumentSnapshot<DocumentData>, boardId: string): Promise<Post> {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      boardId: data.boardId,
      title: data.title,
      content: data.content,
      authorId: data.authorId,
      authorName: data.authorName,
      comments: await getCommentsCount(boardId, docSnap.id),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate(),
    };
  }

async function getCommentsCount(boardId: string, postId: string): Promise<number> {
    const commentsSnapshot = await getDocs(collection(firestore, `boards/${boardId}/posts/${postId}/comments`));
    const commentsCount = await Promise.all(
      commentsSnapshot.docs.map(async (comment) => {
        const repliesSnapshot = await getDocs(
          collection(firestore, `boards/${boardId}/posts/${postId}/comments/${comment.id}/replies`),
        );
        return Number(comment.exists()) + repliesSnapshot.docs.length;
      }),
    );
    return commentsCount.reduce((acc, curr) => acc + curr, 0);
  }