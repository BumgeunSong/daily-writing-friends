import { Timestamp } from 'firebase/firestore';

export interface Draft {
    id: string;
    boardId: string;
    title: string;
    content: string;
    savedAt: Timestamp;
}
