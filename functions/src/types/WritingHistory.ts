import { Timestamp } from "firebase-admin/firestore";

// Subcollection of User
export interface WritingHistory {
    createdAt: Timestamp;
    board: {
        id: string;
    }
    post: {
        id: string;
        contentLength: number;
    }
}