import { firestore } from '../firebase';
import { collection, orderBy, doc, getDoc, where, query, onSnapshot, QueryDocumentSnapshot, DocumentData, getDocs } from 'firebase/firestore';
import { Post } from '../types/Posts';

export const fetchPost = async (id: string): Promise<Post | null> => {
  const docSnap = await getDoc(doc(firestore, 'posts', id));

  if (!docSnap.exists()) {
    console.log('해당 문서가 없습니다!');
    return null;
  }

  return mapDocToPost(docSnap);
};

export function fetchPosts(
  boardId: string,
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>
) {
  const q = query(
    collection(firestore, "posts"),
    where("boardId", "==", boardId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, async (snapshot) => {
    const postsData = await Promise.all(snapshot.docs.map(mapDocToPost));
    setPosts(postsData);
  });
}

async function mapDocToPost(docSnap: QueryDocumentSnapshot<DocumentData>): Promise<Post> {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    boardId: data.boardId,
    title: data.title,
    content: data.content,
    authorId: data.authorId,
    authorName: data.authorName,
    comments: await getCommentsCount(docSnap.id),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate(),
  };
}

async function getCommentsCount(postId: string): Promise<number> {
  const commentsSnapshot = await getDocs(collection(firestore, "posts", postId, "comments"));
  const commentsCount = await Promise.all(commentsSnapshot.docs.map(async (comment) => {
    const repliesSnapshot = await getDocs(collection(firestore, "posts", postId, "comments", comment.id, "replies"));
    return Number(comment.exists()) + repliesSnapshot.docs.length;
  }));
  return commentsCount.reduce((acc, curr) => acc + curr, 0);
}
