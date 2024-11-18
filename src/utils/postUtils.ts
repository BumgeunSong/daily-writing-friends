import { firestore } from '../firebase';
import { collection, orderBy, doc, getDoc, where, query, onSnapshot, QueryDocumentSnapshot, DocumentData, getDocs } from 'firebase/firestore';
import { Post } from '../types/Posts';

export const fetchPost = async (id: string): Promise<Post | null> => {
  const docRef = doc(firestore, 'posts', id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    console.log('해당 문서가 없습니다!');
    return null;
  }

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

  const unsubscribe = onSnapshot(q, async (snapshot) => {
    const postsData: Post[] = await Promise.all(
      snapshot.docs.map(async (post: QueryDocumentSnapshot<DocumentData>) => {
        return await getPostWithComments(post);
      })
    );
    setPosts(postsData)
  });

  return unsubscribe;
}

export async function getPostWithComments(post: QueryDocumentSnapshot<DocumentData>): Promise<Post> {
  const data = post.data();

  return {
    id: post.id,
    boardId: data.boardId,
    title: data.title,
    content: data.content,
    authorId: data.authorId,
    authorName: data.authorName,
    comments: await getCommentsCount(post.id),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate(),
  };
}

async function getCommentsCount(postId: string): Promise<number> {

  const commentsRef = collection(firestore, "posts", postId, "comments");
  const commentsSnapshot = await getDocs(commentsRef);
  const commentsCount = await Promise.all(
    commentsSnapshot.docs.map(async (comment) => {
      const repliesRef = collection(
        firestore,
        "posts",
        postId,
        "comments",
        comment.id,
        "replies"
      );
      const repliesSnapshot = await getDocs(repliesRef);
      const repliesCount = repliesSnapshot.docs.length;

      return Number(comment.exists()) + repliesCount;
    })
  );
  return commentsCount.reduce((acc, curr) => acc + curr, 0)
}
