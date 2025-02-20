import { Timestamp } from "firebase-admin/firestore";

export interface Commenting {
    board: { id: string };
    post: { id: string; title: string; authorId: string; };
    comment: { id: string; };
    createdAt: Timestamp
}