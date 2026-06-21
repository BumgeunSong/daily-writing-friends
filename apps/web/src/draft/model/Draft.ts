import type { FirebaseTimestamp } from '@/shared/model/Timestamp';

export interface Draft {
    id: string;
    boardId: string;
    title: string;
    content: string;
    savedAt: FirebaseTimestamp;
}
