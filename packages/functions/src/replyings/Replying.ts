import { Timestamp } from "firebase-admin/firestore";
// 특정 유저의 답글 작성 내역을 나타낸다
export interface Replying {
    board: { id: string };
    post: { id: string; title: string; authorId: string; };
    comment: { id: string; authorId: string; };
    reply: { id: string; };
    createdAt: Timestamp
}