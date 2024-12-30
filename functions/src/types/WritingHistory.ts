import { Timestamp } from "firebase-admin/firestore";

// Subcollection of User
export interface WritingHistory {
    day: string; // YYYY-MM-DD
    createdAt: Timestamp;
    board: {
        id: string;
    }
    post: {
        id: string;
        contentLength: number;
    }
}