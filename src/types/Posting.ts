import { Timestamp } from "firebase/firestore";

export interface Posting {
    board: {
      id: string;
    };
    post: {
      id: string;
      title: string;
      contentLength: number;
    };
    createdAt: Timestamp;
  }
  