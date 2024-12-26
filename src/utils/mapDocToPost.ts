import { Post } from "../types/Posts";
import { QueryDocumentSnapshot, DocumentData, collection, getDocs } from "firebase/firestore";
import { firestore } from "@/firebase";

export async function mapDocToPost(docSnap: QueryDocumentSnapshot<DocumentData>): Promise<Post> {
    const data = docSnap.data();
    const countOfComments = data.countOfComments ? data.countOfComments : await getCommentsCount(data.boardId, docSnap.id);
    const countOfReplies = data.countOfReplies ? data.countOfReplies : await getRepliesCount(data.boardId, docSnap.id);
    return {
        id: docSnap.id,
        boardId: data.boardId,
        title: data.title,
        content: data.content,
        authorId: data.authorId,
        authorName: data.authorName,
        countOfComments: countOfComments,
        countOfReplies: countOfReplies,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        weekDaysFromFirstDay: data.weekDaysFromFirstDay,
    };
}

// get comment count in the post
async function getCommentsCount(boardId: string, postId: string): Promise<number> {
    const commentsSnapshot = await getDocs(collection(firestore, `boards/${boardId}/posts/${postId}/comments`));
    return commentsSnapshot.docs.length
}

// get replies count of every comment in the post
async function getRepliesCount(boardId: string, postId: string): Promise<number> {
    const repliesSnapshot = await getDocs(collection(firestore, `boards/${boardId}/posts/${postId}/comments`));
    const repliesCount = await Promise.all(
        repliesSnapshot.docs.map(async (reply) => {
            return Number(reply.exists());
        }),
    );
    return repliesCount.reduce((acc, curr) => acc + curr, 0);
}
