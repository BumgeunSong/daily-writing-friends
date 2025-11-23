import { Timestamp } from "firebase-admin/firestore";

// 특정 유저의 댓글 작성 내역을 나타낸다
export interface Commenting {
    board: { id: string };
    post: { id: string; title: string; authorId: string; };
    comment: { id: string; content: string; };
    createdAt: Timestamp
}