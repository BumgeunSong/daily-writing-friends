export interface Posting {
    board: {
      id: string;
    };
    post: {
      id: string;
      title: string;
      contentLength: number;
    };
    createdAt: Date;
    isRecovered?: boolean;
  }
  