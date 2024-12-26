import { Post } from "../types/Posts";
import { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

export async function mapDocToPost(docSnap: QueryDocumentSnapshot<DocumentData>): Promise<Post> {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        boardId: data.boardId,
        title: data.title,
        content: data.content,
        authorId: data.authorId,
        authorName: data.authorName,
        countOfComments: data.countOfComments,
        countOfReplies: data.countOfReplies,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        weekDaysFromFirstDay: data.weekDaysFromFirstDay,
    };
}