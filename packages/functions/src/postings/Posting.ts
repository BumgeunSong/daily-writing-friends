import { Timestamp } from "firebase-admin/firestore";

export interface Posting {
    board: { id: string };
    post: { id: string; title: string; contentLength: number };
    createdAt: Timestamp;
    isRecovered?: boolean;
}